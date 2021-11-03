//User editable configuration
const appPort = 3000;  //The port you wish to run this app on
const appHost = "localhost"; //Host you are running your app on
const mongoHost = "localhost"; //MongoDB hostname
const mongoPort = "27017"; //MongoDB port
const dbName = "todolistDB"; //Name of database to store todo lists

//Require modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const sanitize = require('mongo-sanitize');
const _ = require("lodash");

//Create express server object
const app = express();

//Set our template engine
app.set('view engine', 'ejs');

//Setup middleware
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//Database connection
mongoose.connect("mongodb://" + mongoHost + ":" + mongoPort + "/" + dbName,(err)=>{
  if(err) {
    console.log(err);
  } else {
    console.log("Connected to MongoDB at " + mongoHost + " on port " + mongoPort + " using database " + dbName);
  }
});

//Database schema
const itemsSchema = {
  name: String
};
const listSchema = {
  name: String,
  items: [itemsSchema]
}

//Database models
const Item = mongoose.model("Item", itemsSchema);
const List = mongoose.model("List", listSchema);

//Default items
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Press the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Press this to delete an item."
});

const defaultItems = [item1, item2, item3];

//Routing
app.get("/", (req, res)=> {

  //Get current items
  Item.find({}, (err, items) => {
    if (items.length === 0) {
      //Add the default items
      Item.insertMany(defaultItems, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Default items inserted into database.");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: items
      });
    }
  });
});

app.post("/", (req, res)=> {

  //Get the new item
  const itemName = sanitize(req.body.newItem);

  //For which list is this?
  const listName = sanitize(req.body.list);

  //Create a new document for item
  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    //Default list

    //Save the new document
    item.save();
    //Redirect for display
    res.redirect("/");
  } else {
    //Custom list

    List.findOne({
      name: listName
    }, (err, foundList)=> {
      if (err) {
        //Log the error
        console.log(err);
      } else {
        //Push the new items into the found list
        foundList.items.push(item);
        //save the found list.
        foundList.save();
      }
      //redirect back to the correct route
      res.redirect("/" + listName);
    })
  }



});

app.post("/delete", (req, res)=> {
  const checkedItemId = sanitize(req.body.checkbox);
  const listName = sanitize(req.body.listName);

  if (listName === "Today") {
    //Default list
    Item.findByIdAndRemove(checkedItemId, (err) => {
      if (err) {
        console.log(err);
      }
    });
    res.redirect("/");

  } else {
    //Custom list

    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedItemId
        }
      }
    }, (err, foundList)=> {
      if(err){
        console.log(err);
      } else {
        console.log("Successfully deleted " + checkedItemId + " from " + listName);
      }
    });
    res.redirect("/"+listName);
  }
});

//Dynamic list creation
app.get("/:listName", (req, res)=> {
  const customListName = _.capitalize(sanitize(req.params.listName));

  List.findOne({
    name: customListName
  }, (err, list)=> {
    if (err) {
      console.log(err);
    } else {
      if (list) {
        //we have our list
        res.render("list", {
          listTitle: list.name,
          newListItems: list.items
        });
      } else {
        //No list
        const list = new List({
          name: customListName,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + customListName);
      }
    }
  });

});

app.get("/about", (req, res)=> {
  res.render("about");
});

app.listen(appPort, appHost, function() {
  console.log("Server started at " + appHost + " on port " + appPort);
});
