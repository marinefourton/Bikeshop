var mongoose = require('mongoose')

var orderProductsSchema = mongoose.Schema({
    name: String,
    url: String,
    price: Number,
    quantity: Number,
    articleId : { type: mongoose.Schema.Types.ObjectId, ref: 'articles' },
   });

var ordersSchema = mongoose.Schema({
    dateCommande: Date,
    montantTotal: Number,
    montantProduits: Number,
    montantFraisPort: Number,
    montantReduction: Number,
    CommandeValide: Boolean,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    products:[orderProductsSchema]
})

module.exports = mongoose.model('orders', ordersSchema)