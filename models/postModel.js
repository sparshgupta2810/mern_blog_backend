const {Schema , model, Types} = require('mongoose')

const postSchema = new Schema({
    title: {type: String, require: true},
    category: {type: String, enum: ["Agriculture", "Business", "Education", "Entertainment", "Art", "Investment", "Uncategorized", "Weather"], message: "Value is not supported"},
    description: {type: String, require: true},
    creator: {type: Schema.Types.ObjectId, ref: "User"},
    thumbnail: {type: String, default: 0}

},{ timestamps: true})

module.exports = model('Post', postSchema)