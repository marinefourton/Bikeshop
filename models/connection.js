var mongoose = require('mongoose')

var options = {
    connectTimeoutMS: 5000,
    useUnifiedTopology: true,
    useNewUrlParser: true,
}

mongoose.connect('mongodb+srv://admin:mydatabase@cluster0.esm24.mongodb.net/bikeshop?retryWrites=true&w=majority',
    options,
    function(err){
        console.log(err);
    }
)

module.exports = mongoose