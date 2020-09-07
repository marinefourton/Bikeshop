var mongoose = require('./connection')

var userSchema = mongoose.Schema({
    username: String,
    email: String,
    password: String,
    date: Date
})

var userModel = mongoose.model('users', userSchema)

module.exports = userModel;