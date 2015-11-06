'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var VariationSpecSchema = new Schema({
  text: String,
  value: String,
  mobileImg: [String],
  searchImg: String,
  zoomedImg: [String],
  thumbnails: [String],
  images: [String]
});

var VariationSchema = new Schema({
  name: String,
  //spotlight: String,node index.js -op populate -q "{\"_id\":\"Entertainment\"}"
  values: [VariationSpecSchema]
});

var ProductSchema = new Schema({
  _id: String,
  itemName: String,
  productGender: String,
  category: String,
  subCategory: String,
  brandName: String,
  style: String,
  brandId: String,
  price: String,
  priceWas: String,
  Price2Customer: {type: String},
  discountPrecent: {type: Number, default: 0},
  videomp4: String,
  videoflv: String,
  brand: String,
  description: String,
  filters: [String],
  variations: [VariationSchema],
  url: {type: String, required: true},
  newFlag: {type: Boolean, default: false},
  isImported: {type: Boolean, default: false, required: true},
  hasDetails: {type: Boolean, default: false, required: true},
  isDownload: {type: Boolean, default: false, required: true},
  hasError: {type: Boolean, default: false, required: true},
  lastUpdate: {type: Date, default: Date.now(), required: true},
  isLocked: {type: Boolean, default: false, required: true}
});

var NodeSchema = new Schema({
  _id: {type: String},
  filter: String,
  url: String,
  children: [NodeSchema],
  Multi: {type: Boolean, default: false, required: true},
  lastPageLoaded: {type: Number, default: 0}
});

module.exports.Product = mongoose.model('Product', ProductSchema, 'products');
module.exports.Node = mongoose.model('Node', NodeSchema);
