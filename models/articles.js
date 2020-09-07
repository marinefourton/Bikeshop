var mongoose = require('mongoose')

var articlesSchema = mongoose.Schema({
    name: String,
    url: String,
    price: Number,
    mea: Boolean,
    modeLiv: Array,
    stock: Number,
    stockInBasket: Number
})

module.exports = mongoose.model('articles', articlesSchema)