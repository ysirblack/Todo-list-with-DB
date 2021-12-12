//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true});

const itemsSchema = { //Listemizde sergilenecek itemlerimizin kendi şemaları
  name: String
};

const Item = mongoose.model("Item", itemsSchema); //itemsSchema sını kullanarak Item adında collection oluşturduk(mongoDB buna items diyecek plural alıyor)


const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({ //3 tane default item oluşturduk başta gözükmesi için listemizde
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3]; //default itemlarımızı toplu kullanmak için paketledik

const listSchema = {// Bir çok liste yapabildiğimiz için bu websitesinde, O listeye ait itemleri toplu bir şekilde depo etmek için şemamızı oluşturduk
  name: String,     //Home listemizin işte 4 tane itemi var. Work listemizin 3 tane itemi var vs vs. Arrayimizin ismi ve onun tuttuğu değerler gibi düşün bu bir blueprint
  items: [itemsSchema] //items dediği toplu item alıcak .bu kısımı array olarak düşün.
};

const List = mongoose.model("List", listSchema); //List şemamızı kullanarak Lists collectionımızı oluşturduk. Bu listi kullanarak listeler oluşturabilecez artık
                                                //blueprint kullanarak List adında bir model oluşturduk.


app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems){//Items collectionındaki bütün elemanları bul

    if (foundItems.length === 0) { //eğer item elemanlarının içi boş ise içeriye gir ve dafult itemleri Item collectionuna insert et.
      Item.insertMany(defaultItems, function(err){
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved default items to DB.");
        }
      });
      res.redirect("/"); //bu if e girdik ve tekrar başa geri dön ki aşağıda ki else gir listemizde göster itemleri
    } else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});//.find() dan gelen bulunan itemleri list.ejs de bulunan newListItems a gönderdik.
    }
  });

});

app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName); //eğer kullanıcı custom oarlak kendisi uzantı eklemek siterse o sayfayı oluştur dedik ve aldık onu
                                                                  //nasıl yazarsa yazsın büyük harf veya küçük büyük harfle başlayan bir kelimeye dönüştürdük.

  List.findOne({name: customListName}, function(err, foundList){ //List collection içinde bul bakalım kullanıcının girdiği isime ait bir listemiz var mı
    if (!err){ //error yoksa gir
      if (!foundList){ //List collectionun içinde listeler bulamadıysak gir
        //Create a new list
        const list = new List({
          name: customListName, //kullanıcının girdiği isimi bu List collectionunun ismi yap work yazıdysa bunun ismi Work olucak. örnek.
          items: defaultItems // boş olduğu için listemiz default itemleri buraya attık. item1 item2 item2.
        });
        list.save(); //listemizi kısa yoldan o isimle birlikte save ettik
        res.redirect("/" + customListName); //bunu kullanarak tekrar aynı bu get kısmına geri geldik.zaten lsitemiz doldu artık baştaki if(!foundList) e girmeyecek
      } else {
        //Show an existing list

        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});//bulunan listemizin başlığını listemizin başlığına, bulunan itemlerimizide newListItems a gönderdik
      }
    }
  });



});

app.post("/", function(req, res){ //BUTONA BASIP POST koşulunu sağlarsak

  const itemName = req.body.newItem; //newItem adındaki input html elemntimize yazılanı aldık itemName e attık
  const listName = req.body.list;   //list adındaki butona basıldığında biz ona value dan bir değişken değeri atadık. Listenin ismi neyse o butonun değeri o oluyor.
                                    //yani o butona hangi listede basıldı biliyoruz. Nerenin butonu olduğunu aldık.O listenin ismini aldık

  const item = new Item({ //kullanıcının listeye girdiği adda bir item oluşturduk.
    name: itemName
  });

  if (listName === "Today"){// eğer listenin ismi Todayse yani ana sayfadaysa gir
    item.save(); //itemi direk kayıt et.
    res.redirect("/");//anasayfaya geri git
  } else { //ama anasayfada değilsek gir
    List.findOne({name: listName}, function(err, foundList){ //butonu dan aldığımız hangi listede olduğumuz bilgisini kullanarak , o listeyi çağırdık ki ona ekleme yapabilelim.Zaten oradaysak default oalrak en başta eklenmiş olur default itemler
      foundList.items.push(item);//foundList itemlerine bu itemimizi push ettik
      foundList.save();//save ettik
      res.redirect("/" + listName);//bu listenin sitesine geri dön
    });
  }
});

app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;//checbox değerini itemlerin id si olarak değişken olarak atamıştık o itemin idsine ulaşabildik
  const listName = req.body.listName; //hidden tanımlı listenin ismini tutan dan o listenin ismini aldık

  if (listName === "Today") { //ana sayfaysa bu
    Item.findByIdAndRemove(checkedItemId, function(err){ //itemi id den bul ve kaldır
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/");//ana sayfaya geri dön
      }
    });
  } else {//ana sayfada değilsek custom oluşturulmuş bir listedeysek
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){//O listeye git, o id ye ait itemi itemler kısmından kaldır.
      if (!err){
        res.redirect("/" + listName);//listenin sayfasına geri dön
      }
    });
  }


});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
