var express = require('express');
var router = express.Router();

const stripe = require('stripe')('sk_test_dR33tXRXN7n4cCfrkxEZKBis00ginBDyGz');

// var dataBikeArray = [
//   {id:1,name:"BIK045", url:"/images/bike-1.jpg", price:679, mea:true, modeLiv:[1,2], stock:0},
//   {id:2,name:"ZOOK07", url:"/images/bike-2.jpg", price:999, mea:true, modeLiv:[1,3], stock:10},
//   {id:3,name:"TITANS", url:"/images/bike-3.jpg", price:799, mea:false, modeLiv:[1,2,3], stock:2},
//   {id:4,name:"CEWO", url:"/images/bike-4.jpg", price:1300, mea:true, modeLiv:[1,2,3], stock:2},
//   {id:5,name:"AMIG039", url:"/images/bike-5.jpg", price:479, mea:false, modeLiv:[1,2,3], stock:2},
//   {id:6,name:"LIK099", url:"/images/bike-6.jpg", price:869, mea:true, modeLiv:[1,2,3], stock:2},
// ]

var codePromoTab = [
  {id:1,code:"REDUC30", type:"montant",valeur:30},
  {id:1,code:"20POURCENT",type:"pourcent",valeur:20},
]

var articleModel = require('../models/articles');
var orderModel = require('../models/orders');
var userModel = require('../models/users');

// *** Ces fonctions devront être déplacées dans un module à exporter ***

var getProducts = (products, cardBike) => {
  for(var i=0;i<products.length;i++){
    //var foundProduct = cardBike.find(element => element.id == products[i].id);
    if(products[i].stockInBasket === undefined){
      products[i].stockInBasket = 0
    }
    products[i].stockDispo = products[i].stock - products[i].stockInBasket
    // if(foundProduct){
    //   products[i].stockDispo -= foundProduct.quantity
    // }
    
  }

  return products
}

// Fonction qui crée la session sur stripe
var sendToStripe = async (dataCardBike,selectedModeLiv,promoCmd) => {
  var stripeCard = [];

  for(var i=0;i<dataCardBike.length;i++){
    stripeCard.push({
      name: dataCardBike[i].name,
      amount: dataCardBike[i].price * 100,
      currency: 'eur',
      quantity: dataCardBike[i].quantity,
    })
  }

  //Si frais de port, on push dans Stripe comme un produit
  if(selectedModeLiv!== undefined && selectedModeLiv.montant>0){
    stripeCard.push({
      name: 'Frais de port',
      amount: selectedModeLiv.montant * 100,
      currency: 'eur',
      quantity: 1,
    })
  }

  //On applique la promotion sur les différents produits de la session Stripe
  
  if(promoCmd.length>0){
    for(j=0;j<promoCmd.length;j++){
      var montantRestant = promoCmd[j].montant
      for(var i=0;i<stripeCard.length;i++){

        if(montantRestant>0){
          if(stripeCard[i].amount*stripeCard[i].quantity > (montantRestant*100 + 1)){
            stripeCard[i].amount = stripeCard[i].amount - montantRestant*100/stripeCard[i].quantity
            montantRestant = 0
          } else {
            montantRestant -= (stripeCard[i].amount/100 - 1) * stripeCard[i].quantity
            stripeCard[i].amount = 100
            
          }
        }
      }
    }
    
  }


  var sessionStripeID;

  if(stripeCard.length>0){
    var session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeCard,
      success_url: 'http://127.0.0.1:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://127.0.0.1:3000/',
    });

    sessionStripeID = session.id;
  
  }

  return sessionStripeID
}

// Fonction qui calcule les frais de port et le total de la commande
var calculTotalCommande = (dataCardBike, modeLivraison) => {
  console.log(modeLivraison)
  var totalCmd = 0

  var montantFraisPort = 0
  if(modeLivraison !== undefined){
    montantFraisPort = modeLivraison.montant
  }

  for(var i = 0; i< dataCardBike.length; i++){
    totalCmd += dataCardBike[i].quantity * dataCardBike[i].price
  }

  totalCmd += montantFraisPort

  return {montantFraisPort,totalCmd}
}

var getModeLivraison = (dataCardBike) => {

  var nbProduits = 0
  var totalCmd = 0
  
  var listMLDispoProducts = []
  
  for(var i = 0; i< dataCardBike.length; i++){
    nbProduits += dataCardBike[i].quantity
    totalCmd += dataCardBike[i].quantity * dataCardBike[i].price

    if(i==0){
      listMLDispoProducts = dataCardBike[i].modeLiv
    }
    listMLDispoProducts = listMLDispoProducts.filter(e => dataCardBike[i].modeLiv.includes(e))

  }

  //Règle frais de port standard
  var montantFraisPortStandard = nbProduits * 30

  if(totalCmd>4000){
    montantFraisPortStandard = 0
  } else if(totalCmd>2000){
    montantFraisPortStandard = montantFraisPortStandard / 2
  }

  //Règle frais de port express
  var montantFraisPortExpress = montantFraisPortStandard+100

  //Règle frais de port Retrait
  var montantFraisPortRetrait= nbProduits * 20 + 50


  var listeModeLivraison = [
    {id:'1', libelle:'Frais de port standard', montant:montantFraisPortStandard},
    {id:'2', libelle:'Frais de port Express', montant:montantFraisPortExpress},
    {id:'3', libelle:'Frais de port Retrait', montant:montantFraisPortRetrait},
  ]

  listeModeLivraison = listeModeLivraison.filter(e => listMLDispoProducts.includes(e.id))

  return listeModeLivraison.sort((a, b) => parseFloat(a.montant) - parseFloat(b.montant));

}

//Fonction qui récupère les 3 produits à mettre en avant
var getMeaList = (dataBike) => {
  dataBike.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  dataBike = dataBike.filter(a => a.mea === true);
  dataBike = dataBike.slice(0,3)
  return dataBike
}


/* GET home page. */
router.get('/', async function(req, res, next) {

  if(req.session.user == null){
    res.redirect('/login')
  } 

  if(req.session.dataCardBike == undefined){
    req.session.dataCardBike = []
    req.session.promoCmd = []
  }

  var dataBikeArray = await articleModel.find();

  var dataBike = getProducts(dataBikeArray,req.session.dataCardBike)
  var mea = getMeaList(dataBike)
  
  res.render('index', {dataBike:dataBike, mea});
});


router.get('/shop', async function(req, res, next) {

  if(req.session.user == null){
    res.redirect('/login')
  } 

  if(req.session.dataCardBike == undefined){
    req.session.dataCardBike = []
    req.session.promoCmd = []
  }

  //Liste des modes de livraison
  var modeLivraison = getModeLivraison(req.session.dataCardBike)


  //Par defaut, on propose le mode de livraison le moins cher
  if(req.session.modeLivraison == undefined){
    req.session.modeLivraison = modeLivraison[0]
  }

  req.session.modeLivraison = modeLivraison.find(e => e.id == req.session.modeLivraison.id)


  var infoCommande = calculTotalCommande(req.session.dataCardBike, req.session.modeLivraison)
  
  //Calcul total commande
  var montantCommande = infoCommande.totalCmd

  //Application des promos de cmd
  var promoCmd = []
  var products = []

  var promoCmd = []
  for(i=0;i<req.session.dataCardBike.length;i++){
    if(req.session.dataCardBike[i].quantity>1){
      var reduction = Math.round(req.session.dataCardBike[i].price * 0.2 *100) / 100
      promoCmd.push({code:'20% pour 2',libelle:'20% pour 2',montant:reduction, suppr:false})
      montantCommande -= reduction
    }
    products.push({name: req.session.dataCardBike[i].name,
      url: req.session.dataCardBike[i].url,
      price: req.session.dataCardBike[i].price,
      quantity: req.session.dataCardBike[i].quantity,
      articleId : req.session.dataCardBike[i].id})
  }


  for(var i=0;i<req.session.promoCmd.length;i++){
    if(req.session.promoCmd[i].type === 'montant'){
      var reduction = req.session.promoCmd[i].valeur
      montantCommande -= reduction
      promoCmd.push({code:req.session.promoCmd[i].code,libelle:`${reduction} €`,montant:reduction, suppr:true})
    } else {
      var reduction =  Math.round(100*req.session.promoCmd[i].valeur*montantCommande/100)/100
      promoCmd.push({code:req.session.promoCmd[i].code,libelle:`${req.session.promoCmd[i].valeur} %`,montant:reduction, suppr:true})
      montantCommande -= reduction
    }
  }

  montantCommande = Math.round(100*montantCommande)/100
  console.log(infoCommande)

  //On enregistre la commande en base de données
  if(req.session.idbdd){
    await orderModel.findOneAndUpdate({_id:req.session.idbdd,userId:req.session.user.id},{
      dateCommande: Date.now(),
      montantTotal: montantCommande,
      montantProduits: infoCommande.totalCmd - infoCommande.montantFraisPort,
      montantFraisPort: infoCommande.montantFraisPort,
      montantReduction : Math.round((montantCommande - infoCommande.totalCmd)*100) / 100,
      CommandeValide: false,
      products:products
     })
  } else {
    var newOrder = new orderModel ({
      dateCommande: Date.now(),
      montantTotal: montantCommande,
      montantProduits: infoCommande.totalCmd - infoCommande.montantFraisPort,
      montantFraisPort: infoCommande.montantFraisPort,
      montantReduction : Math.round((montantCommande - infoCommande.totalCmd)*100) / 100,
      CommandeValide: false,
      userId:req.session.user.id,
      products:products
     });

     var order = await newOrder.save();

     //On stocke l'id de la commande en session
    req.session.idbdd = order.id
  }

  

  
  // On enregistre le panier dans une session de Stripe
  var sessionStripeID = await sendToStripe(req.session.dataCardBike,req.session.modeLivraison,promoCmd)

  res.render('shop', {dataCardBike:req.session.dataCardBike, sessionStripeID, selectedModeLiv: req.session.modeLivraison,modeLivraison, montantCommande, promoCmd });
});


router.get('/add-shop', async function(req, res, next) {
  var alreadyExist = false;
  var stockLeft = true


  var article = await articleModel.findById(req.query.id)

  if(article.stock-article.stockInBasket === 0){
    stockLeft = false
  }

  if(stockLeft === true){
    for(var i = 0; i< req.session.dataCardBike.length; i++){
      if(req.session.dataCardBike[i].id == req.query.id){
        req.session.dataCardBike[i].quantity = req.session.dataCardBike[i].quantity + 1;
        alreadyExist = true;
      }
    }

    if(alreadyExist == false){
      var searchProduct = await articleModel.findById(req.query.id);
      var selectedProduct = {id:searchProduct.id,name:searchProduct.name, url:searchProduct.url, mea:searchProduct.mea, price:searchProduct.price, stock:searchProduct.stock,modeLiv:searchProduct.modeLiv,quantity:1}
      console.log(selectedProduct)
      req.session.dataCardBike.push(selectedProduct)
    }
  
    await articleModel.findOneAndUpdate({_id:req.query.id},{$inc : {'stockInBasket' : 1}})
  }

  res.redirect('/shop')

});

router.post('/add-codepromo', async function(req, res, next){

  var codePromo = req.body.codePromo
  
  // On vérifie que le code promo est dans la liste
  var codePromoApply = codePromoTab.find(element => element.code == codePromo);

  if(codePromoApply){
    req.session.promoCmd.push(codePromoApply)
  }



  res.redirect('/shop')
})

router.get('/del-codepromo', async function(req, res, next){

    req.session.promoCmd = []

  res.redirect('/shop')
})

router.post('/update-modeliv', async function(req, res, next){
  var modeLivraison = getModeLivraison(req.session.dataCardBike)

  var selectedModeLiv = modeLivraison.find(element => element.id == req.body.modeLivraison);

  req.session.modeLivraison = selectedModeLiv

  res.redirect('/shop')
})

router.get('/delete-shop', async function(req, res, next){

  var position = null
  var quantityToDelete = 0
  
  for(let i=0;i<req.session.dataCardBike.length;i++){
    if(req.session.dataCardBike[i].id === req.query.id){
      position = i
      quantityToDelete = -1 * req.session.dataCardBike[i].quantity
    }
  }

  req.session.dataCardBike.splice(req.query.id,1)

  await articleModel.findOneAndUpdate({_id:req.query.id},{$inc : {'stockInBasket' : quantityToDelete}})

  res.redirect('/shop')
})

router.post('/update-shop', async function(req, res, next){
  
  var id = req.body.id;
  var newQuantity =  Number(req.body.quantity);
  var position = null
  var stockLeft = true
  var quantityToUpdate = 0
  console.log(req.session)
  for(let i=0;i<req.session.dataCardBike.length;i++){

    if(req.session.dataCardBike[i].id === id){
      position = i
      quantityToUpdate = newQuantity - req.session.dataCardBike[i].quantity
    }
  }

  if(quantityToUpdate>0){
    var article = await articleModel.findById(id)
    var stockDispo = article.stock-article.stockInBasket
    if(stockDispo < quantityToUpdate){
      
      newQuantity = newQuantity - quantityToUpdate + stockDispo
      quantityToUpdate = stockDispo
      if(quantityToUpdate === 0){
        stockLeft = false
      }
    }
  }

  if(stockLeft === true){
      req.session.dataCardBike[position].quantity =newQuantity;
      await articleModel.findOneAndUpdate({_id:id},{$inc : {'stockInBasket' : quantityToUpdate}})
  }

  res.redirect('/shop')
})

router.get('/success', async function(req, res, next){
  await orderModel.findOneAndUpdate({_id:req.session.idbdd,userId:req.session.user.id},{
    CommandeValide: true
   })
   req.session.dataCardBike = []
   req.session.promoCmd = []
  res.render('confirm');
})

router.get('/orders', async function(req, res, next){
  if(req.session.user == null){
    res.redirect('/login')
  } 
  var orders = await orderModel.find({userId:req.session.user.id})
  res.render('orders', {orders});
})

router.get('/addProduct', function(req, res, next){
  res.render('addProduct');
})

router.post('/addProduct', async function(req, res, next){
  console.log(req.body)

  var newProduct = new articleModel ({
    name: req.body.name, 
    url: req.body.url, 
    mea: req.body.mea, 
    price: req.body.price, 
    stock: req.body.stock, 
    stockInBasket: 0, 
    modeLiv: req.body.modeliv    
  });

  var productSaved = await newProduct.save();

  res.redirect('/addProduct');
})

router.post('/sign-up', async function(req,res,next){

  var searchUser = await userModel.findOne({
    email: req.body.emailFromFront
  })
  
  if(!searchUser){
    var newUser = new userModel({
      username: req.body.usernameFromFront,
      email: req.body.emailFromFront,
      password: req.body.passwordFromFront,
      date: Date.now()
    })
  
    var newUserSave = await newUser.save();
  
    req.session.user = {
      name: newUserSave.username,
      id: newUserSave._id,
    }
  
    console.log(req.session.user)
  
    res.redirect('/')
  } else {
    res.redirect('/login')
  }
  
})

router.post('/sign-in', async function(req,res,next){

  var searchUser = await userModel.findOne({
    email: req.body.emailFromFront,
    password: req.body.passwordFromFront
  })

  if(searchUser!= null){
    req.session.user = {
      name: searchUser.username,
      id: searchUser._id
    }
    res.redirect('/')
  } else {
    res.redirect('/login')
  }

  
})

router.get('/logout', function(req,res,next){

  req.session.user = null;

  res.redirect('/')
})

router.get('/login', function(req,res,next){

  res.render('login')
})

router.get('/charts', async function(req, res, next) {

  var aggr = userModel.aggregate()

  aggr.group({ _id: {year: {$year:'$date'}, month:{$month: '$date'}}, nb:{$sum:1}})
  
  aggr.sort({ _id : 1})

  var nbUserByMonth = await aggr.exec()


  var aggr = orderModel.aggregate()

  aggr.match({CommandeValide:true})

  aggr.group({ _id: {year: {$year:'$dateCommande'}, month:{$month: '$dateCommande'}}, nb:{$sum:1}})
  
  aggr.sort({ _id : 1})

  var nbCmdByMonth = await aggr.exec()

  var aggr = orderModel.aggregate()

  aggr.match({CommandeValide:true})
  //aggr.unwind("products")
  aggr.unwind({ path: '$products', preserveNullAndEmptyArrays: true });

  aggr.group( { _id : "$products.name", nbventes: { $sum: "$products.quantity" }});
  
  aggr.sort({ _id : -1})

  var topProducts = await aggr.exec()
  topProducts = topProducts.slice(0,10)

  console.log(nbCmdByMonth,nbUserByMonth,topProducts)
  res.render('charts',{nbCmdByMonth,nbUserByMonth,topProducts});
});

module.exports = router;
