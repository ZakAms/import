/**
 * Created by shadim on 5/19/15.
 */
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var slash = require('slash');
var mkdirp = require('mkdirp');
var url = require('url');
var request = require('request');
var async = require('async');
var webdriver = require('selenium-webdriver');
var By = require('selenium-webdriver').By;
var until = require('selenium-webdriver').until;

var Product = require('./product.model').Product;
//var Filter = require('../../api/product/product.model').Filter;
var Node = require('./product.model').Node;

var regex = new RegExp(/background\-image: url\((.*)\);$/);
var filterRegex = new RegExp(/(.+)\s+\((\d+)\)/);

var isElementPresent = function (driver) {
    //driver.manage().timeouts().implicitlyWait(7000);
    driver.manage().timeouts().implicitlyWait(0);
    try {
        driver.findElement(By.xpath("//*[@id='searchResults']/a"));
        console.log("products page >> found..");
        return true;
    }
    catch (Exception) {
        console.log("can not extract products page >> wait..");
        return false;
    }
    finally {
        console.log("products page >> finally set 30sec wait..");
        // driver.quit();
        // driver = getDriver();
        // driver.manage().timeouts().implicitlyWait(30000);
    }
}

var getVariations = function (webDriver, data, cb) {

    data.variations = [];
    var variation = {
        name: '',
        values: []
    };
   // console.log("getVariations 1");

    var currentIndex = 0;
    var error = null;
    var hasD4 = true;
    var D4 = null;
    var Skip =false;

    return webDriver.findElements(By.xpath("//select[@class='btn secondary']"))
        .then(function (selects) {
            //console.log("getVariations 2");
            if( selects.length == 3)
                Skip = true;

            selects.forEach(function (s) {
                s.getAttribute('id')
                    .then(function (id) {
                        variation.name = id;
                    }, function (err) {
                        console.log("getVariations no optionId");
                        cb(err);
                    })
                    .then(function () {

                        return s.findElements(By.tagName('option'));
                    })
                    .then(function (options) {
                        options.forEach(function (option) {
                            option.getText()
                                .then(function (t) {

                                    var value = {
                                        text: t
                                    }

                                    if (variation.name === "color") {
                                        value.mobileImg = [];
                                        value.searchImg = "";
                                        value.zoomedImg = [];
                                        value.thumbnails = [];
                                        value.images = [];
                                    }

                                    variation.values.push(value);

                                    return option;
                                }, function (err) {
                                    cb(err);
                                }).then(function (o) {
                                    return o.getAttribute('value');
                                }).then(function (value) {
                                    currentIndex = variation.values.length - 1;
                                    variation.values[currentIndex].value = value;
                                    if (variation.name === "color")
                                        return webDriver.findElements(By.xpath('//a[@data-' + variation.name + ' = "' + variation.values[currentIndex].value + '"]'));

                                    return [];

                                }, function (err) {
                                    cb(err);
                                }).then(function (links) {
                                    if (links.length && links.length > 0) {
                                        links[0].click();
                                    }
                                    if (variation.name === "color")
                                        return webDriver.findElements(By.xpath("//*[contains(@id,'angle-')]"));

                                    return [];

                                }, function (err) {
                                    cb(err);
                                }).then(function (thumbs) {
                                    if (variation.name === "color") {
                                        thumbs.forEach(function (thumb) {

                                            thumb.click();

                                            thumb.findElement(By.tagName('span'))
                                                .getAttribute('style')
                                                .then(function (uri) {
                                                    var m = uri.match(regex);
                                                    var thumbnail = m[1];
                                                    var searchImage = thumbnail.replace('MULTIVIEW_THUMBNAILS.jpg', 'LARGE_SEARCH.jpg');
                                                    var zoomImage = thumbnail.replace('MULTIVIEW_THUMBNAILS.jpg', '4x.jpg');
                                                    var mobileImage = thumbnail.replace('MULTIVIEW_THUMBNAILS.jpg', 'MOBILETHUMB.jpg');
                                                    var image = thumbnail.replace('MULTIVIEW_THUMBNAILS.jpg', 'MULTIVIEW.jpg');

                                                    variation.values[currentIndex].thumbnails.push(thumbnail);

                                                    if (searchImage.indexOf('-p-LARGE_SEARCH.jpg') > 0)
                                                        variation.values[currentIndex].searchImg = searchImage;

                                                    variation.values[currentIndex].mobileImg.push(mobileImage);
                                                    variation.values[currentIndex].zoomedImg.push(zoomImage);
                                                    variation.values[currentIndex].images.push(image);
                                                });
                                        });
                                    }
                                }, function (err) {
                                    cb(err);
                                });
                        });
                    },
                    function (err) {
                        cb(err);
                    })
                    .then(function () {
                        data.variations.push(variation);
                        variation = {
                            name: '',
                            values: []
                        };
                    });
            });
        },
        function (err) {
            console.log("getVariations 3");
            cb(err);
        })
        // extract d4 variation
        .then(function () {
            if(!Skip) {
                //console.log("getVariations 4");
                return webDriver.findElement(By.xpath('//*[@id="d4"]'));
            }
            return;
        }, function (err) {
            //cb(err);
            console.log("getVariations 5 : no id d4 found");
        })
        .then(function (d4) {
            if(!Skip) {
                //console.log("getVariations 6");
                D4 = d4;
                if (hasD4)
                    return d4.getAttribute('id');
            }
        })
        .then(function (id) {
            if (!Skip) {
                //console.log("getVariations 7");

            variation = {
                name: id,
                values: []
            };
        }
        })
        .then(function () {
            if (!Skip) {
                //console.log("getVariations 8");
                if (D4) {
                    //console.log("getVariations 8.1");
                    return webDriver.findElement(By.xpath('//*[@id="dimension-width"]/p'));
                }
            }
        }, function (err) {
            console.log("getVariations 9");
        })
        .then(function (note) {
            if(!Skip) {
                //console.log("getVariations 10");
                if (D4)
                    return note.getText();
            }
        })
        .then(function (text) {
            if(!Skip) {
                //console.log("getVariations 11");
                if (D4) {
                    variation.values.push({text: text, value: null});
                }
            }
        })
        .then(function () {
            if(!Skip) {
                //console.log("getVariations 12");
                if (D4)
                    return D4.getAttribute('value');
            }
        })
        .then(function (value) {
            if(!Skip) {
                //console.log("getVariations 13");
                if (D4) {
                    currentIndex = variation.values.length - 1;
                    variation.values[currentIndex].value = value;
                }
            }
        }).then(function () {
            //console.log("getVariations 14");
            data.variations.push(variation);
        });
}


var download = function (uri, filename, callback) {
    try {
        request(uri).on('error',function(err){
            console.log('error: %s', err);
        }).pipe(fs.createWriteStream(filename)).on('close', callback);
        /*request.head(uri, function (err, res, body) {
         console.log(uri);
         //console.log('content-type:', res.headers['content-type']);

         //console.log('content-length:', res.headers['content-length']);


         }
         );*/
    } catch (e) {
        console.log(e);
    }
};

var saveImages = function (v, cb) {

    var f = path.basename(v);
    var pathname = url.parse(v).pathname;

    if (!pathname) {
        console.log(">>>>>>>>>>" + v);
    }

    var dir = path.join(path.resolve('assets/public'), pathname.replace(f, ''));
    var file = path.join(dir, f);

    console.log("dir:" + dir);
    console.log("file:" + file);
    mkdirp(dir, function (err) {
        if (err) {
            cb(err);
            console.log(err);
        } else {
            download(v, file, function () {
                cb(null, file);
            });
        }
    });
}

// get pagination info max page size and url pattern
var paginationInfo = function (driver) {

    var pager;

    return driver.findElements(By.xpath('//span/a[contains(@class,"pager")][last()]'))
        .then(function (pagers) {
            if (pagers.length > 0) {
                pager = pagers[pagers.length - 1];
            } else
                pager = driver.findElement(By.xpath('//div[@class="pagination"]/a[last()-1]'));
        })
        .then(function () {
            return pager.getText();
        }, function (err) {
            console.log("no pagination presented maxPage will be set to 1: " + err.state);
            return 1;
        })
        .then(function (maxPage) {
            return maxPage;
        });
}


// populate products with filter
var populateProductsWithFilter = function (driver, maxPage, node) {

    var filter = node.filter + ":" + node._id;
    var index = node.lastPageLoaded + 1;
    var runto = node.lastPageLoaded;

    if (maxPage <= runto) {
        index = maxPage;
        return;
    }
    async.doWhilst(
        function (callback) {
            var output = [];
            var tasks = [];
            var errorsIdx = 0;

            var break1 = true;
            while (true) {
                break1 = true;
                try {
                    // write your code here
                    //isElementPresent(driver)
                    driver.sleep(1000);
                    driver.findElements(By.xpath("//*[@id='searchResults']/a"))
                        //driver.sleep(1000)
                        .then(function (products) {
                            if (index >= runto) {
                                console.log("total product in page:" + products.length);

                                products.forEach(function (product) {
                                    tasks.push(function (cb) {
                                        var data = {};
                                        var hasError = false;
                                        var dbexist = false;
                                        var tmpId;
                                        //console.log("-----------------element:" +product);

                                        var breakIt = true;
                                        while (true) {
                                            breakIt = true;
                                            try {
                                                // write your code here
                                                product.getAttribute('href')
                                                    .then(function (url) {
                                                        data.url = url;
                                                        tmpId = product.getAttribute('data-product-id');
                                                        return tmpId;
                                                    }, function (err) {
                                                        hasError = true;
                                                        errorsIdx++;
                                                        console.log("Errors in page:" + errorsIdx);
                                                        console.error("can not extract href for product " + err);
                                                        //throw err;
                                                        //console.log("==================================");
                                                        //console.log("product id: %d " + tmpId);
                                                        //console.log("==================================");
                                                        //callback(err);
                                                        //cb(err);
                                                        //process.exit(0);
                                                    })

                                                    .then(function (id) {

                                                        if (!hasError) {
                                                            data._id = 'Z-' + id;
                                                            data.hasDetails = false;
                                                            data.isDownload = false;
                                                            data.isImported = true;
                                                            data.hasError = false;
                                                            data.isLocked = false;
                                                            data.lastUpdate = Date.now();
                                                            data['$addToSet'] = {"filters": filter};
                                                        }
                                                        return;
                                                    })


                                                    // populate newFlag
                                                    .then(function () {
                                                        return product.findElement(By.xpath('span[@class="flag"]'));
                                                    }).then(function (element) {
                                                        data.newFlag = (element) ? true : false;
                                                    }, function (err) {
                                                        data.newFlag = false;
                                                    })
                                                    // populate brandName
                                                    .then(function () {
                                                        return product.findElement(By.xpath('span[@class="brandName"]')).getText();
                                                    })
                                                    .then(function (bname) {
                                                        data.brandName = bname;
                                                    }, function (err) {
                                                    })
                                                    // populate itemName
                                                    .then(function () {
                                                        return product.findElement(By.xpath('span[@class="productName"]')).getText();
                                                    })
                                                    .then(function (productName) {
                                                        data.itemName = productName;
                                                    }, function (err) {
                                                    })
                                                    // populate price
                                                    .then(function () {
                                                        return product.findElement(By.xpath('span[@class="productPrice"]/span')).getText();
                                                    }).then(function (price) {
                                                        data.price = price;
                                                    }, function (err) {
                                                    })
                                                    .then(function () {
                                                        if (!hasError) {
                                                            output.push(data);

                                                            cb(null, data);
                                                        }
                                                    });
                                            }
                                            catch (e) {
                                                if (e.getMessage().contains("element is not attached")) {
                                                    breakIt = false;
                                                    console.log("Errors  catch!! in page:" + errorsIdx);
                                                }
                                            }
                                            if (breakIt) {
                                                break;
                                            }

                                        }
                                    });
                                });
                            }
                        }, function (err) {
                            console.error("can not extract products page " + index + " error: " + err);
                            callback(err);
                        })
                        .then(function () {
                            async.parallel(tasks, function (err) {
                                if (err) {
                                    //console.error("populateProductsWithFilter: " + err);
                                    //console.log("==================================");
                                    //console.log("time out product id: %s " +  tmpId);
                                    //console.log("==================================");
                                    return callback(err);
                                }

                                if (index >= runto) {
                                    console.log("start populating page: #" + index + "\/" + maxPage);
                                    console.log("Total items update:" + output.length);
                                    output.forEach(function (p) {
                                        Product.findByIdAndUpdate(p._id, p, {
                                            new: true,
                                            upsert: true
                                        }, function (err, p1) {
                                            if (err) {
                                                console.error("error updating product: " + err);
                                                return callback(err);
                                            }
                                        });
                                    });
                                }
                                var hasError = false;

                                if (maxPage === 1 || index == maxPage) {
                                    updateNodelastpage(index, node);
                                    index++;
                                    callback();
                                } else {

                                    var selector = (index == 1) ?
                                        By.xpath('//*[@id="resultWrap"]/div[2]/div/a[1]')
                                        : By.xpath('//*[@id="resultWrap"]/div[2]/div/a[3]');

                                    var breakIt = true;
                                    while (true) {
                                        breakIt = true;
                                        try {
                                            // write your code here
                                            driver.findElement(selector)
                                                .then(function (p) {
                                                    //driver.sleep(4000);
                                                    return p.click();
                                                }, function (err) {
                                                    console.log("no more pages to go next: " + index + " error: " + err);
                                                    callback(err);
                                                })

                                                .then(function () {
                                                    if (!hasError) {
                                                        driver.sleep(3000);
                                                        console.log("product population of page #" + index + " completed successfully.");
                                                        if (index >= runto) {
                                                            updateNodelastpage(index, node)
                                                        }

                                                        index++;
                                                        callback();
                                                    }
                                                });
                                        } catch (e) {
                                            if (e.getMessage().contains("element is not attached")) {
                                                breakIt = false;
                                            }
                                        }
                                        if (breakIt) {
                                            break;
                                        }
                                    }
                                }
                            });
                        });
                } catch (e) {
                    if (e.getMessage().contains("element is not attached")) {
                        console.error("catched - Error in searchResults : " + e.getMessage());
                        break1 = false;
                    }
                }
                if (break1) {
                    break;
                }

            }


        },
        function () {
            return index <= maxPage;
        },
        function (err) {
            if (err) {
                return console.error("populateProductsWithFilter: " + err);
            }
        }
    );
}

var updateNodelastpage = function (index, node) {


    Node.findById(node._id, function (err, upnode) {
        if (err) return handleError(err);

        upnode.lastPageLoaded = index;
        upnode.save(function (err) {
            if (err) return handleError(err);
        });
    });
}

var getDriver = function () {
    var driver = new webdriver.Builder()
        .forBrowser('chrome')
        .build();

    //driver.manage().timeouts().pageLoadTimeout(10000);
    //driver.manage().timeouts().implicitlyWait(7000);
    //driver.manage().timeouts().setScriptTimeout(5000);
    return driver;
}

var isRootScan = function (item) {
    //return (item.url === "http://www.zappos.com/null-page1/.zso?p=0&s=goliveRecentSalesStyle/desc/"); //All
    return (item.url === "http://www.zappos.com/womens-clothing~6H#!/clothing~E"); //Clothing
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/shoes~3Y"); //Shoes
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/bags~2q"); //Bags
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/accessories~4?s=goliveRecentSalesStyle/desc/"); //Accessories
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/jewelry~C?s=goliveRecentSalesStyle/desc/"); //Jewelry
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/eyewear~9?s=goliveRecentSalesStyle/desc/"); //Eyewear
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/watches~1c"); //Watches
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/sporting-goods~r?s=goliveRecentSalesStyle/desc/"); //Sporting-goods
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/baby-shop~5?s=goliveRecentSalesStyle/desc/"); //baby-shop
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/entertainment~2"); //Entertainment
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/home~1?s=goliveRecentSalesStyle/desc/"); //Home
    //return (item.url === "http://www.zappos.com/siwy-denim-women-jeans/CKvXARDI1wE6AvUDWgKpHXoClAWCAQOs1wXAAQHiAgYBCxgCDwc.zso?s=goliveRecentSalesStyle/desc/#!/beauty~x"); //Beauty
}

var updateIgnoreList = function (queue, ignoreList) {

    queue.forEach(function (node, index, q) {
        var i = node.parent;

        var itemIgnoreList = ignoreList;

        while (i) {
            _.merge(itemIgnoreList, i.ignoreList);
            i = i.parent;
        }

        node.ignoreList = itemIgnoreList;
        q[index] = node;
    });
}

var prepareNodesForUpdate = function (roots) {

    var q = [];

    roots.forEach(function (root) {

        q.push(root);

        while (q.length > 0) {

            var node = q.shift();
            delete node.parent;
            delete node.ignoreList;

            node.children.forEach(function (n) {
                q.push(n);
            });
        }

        Node.create(root, function (err) {
            if (err)
                return console.error("can not create root._id = %s err = %s", root._id, err);

            console.log("create root._id = %s successfully", root._id);
        });
        console.log("products filters completed successfully.");

    });

}

exports.buildCategoryTree = function () {

    var driver = getDriver();
    var roots = [];

    var queue = [{
        url: "http://www.zappos.com/womens-clothing~6H#!/clothing~E",

        ignoreList: {
            //GENDER: 'GENDER',
            //BRAND: 'BRAND',
            //PRICE: 'PRICE',
            //COLOR: 'COLOR'


        }
    }];

    async.doWhilst(function (callback) {

            var item = queue.shift();
            var isRoot = isRootScan(item);
            var tempIgnoreList = {};

            console.log("============== Start new page queue shift  ====================");
            console.log("isRoot: " + isRoot);
            console.log("item url: " + item.url);


            driver.get(item.url)
            driver.sleep(800)

                .then(function () {
                    return driver.findElements(By.xpath('//*[@id="naviCenter"]/h4'));
                }, function (err) {
                    console.log("[id=naviCenter]/h4 not found: " + err);
                })

                .then(function (elements) {
                    var breakIt = true;
                    while (true) {
                        breakIt = true;
                        try {
                            // write your code here
                            elements.forEach(function (elem) {

                                var type;
                                var isMulti;

                                elem.getText()

                                    .then(function (title) {
                                        type = title;
                                        tempIgnoreList[type] = type;
                                        console.log("============== Start element ====================");
                                        console.log("category element title = %s ", type);
                                    }, function (err) {
                                        console.log("Error in category element title = %s \n ERROR:%s", type, err);
                                        callback();
                                    })

                                    .then(function () {
                                        return elem.findElement(By.xpath("./following-sibling::div[1]"));
                                    }, function (err) {
                                        console.log("Errrorrrrr-2 \n ERROR:%s", type, err);
                                        callback();
                                    })

                                    /* .then(function (s) {
                                     return s.getAttribute('class');
                                     }, function (err) {
                                     console.log("Errrorrrrr-3 \n ERROR:%s", type,err);

                                     })

                                     .then(function (value) {
                                     isMulti = value.indexOf('nwMulti');
                                     console.log("isMulti = " + isMulti);
                                     }, function (err) {
                                     console.log("Errrorrrrr-4 \n ERROR:%s", type,err);
                                     isMulti = false;

                                     })*/

                                    .then(function () {
                                        if (item.ignoreList[type]) {
                                            console.log("Type exist in item.ignoreList[type]");
                                            return [];
                                        }
                                        console.log("Type Don't exist in item.ignoreList[type]");
                                        return elem.findElements(By.xpath("./following-sibling::div[1]/a"));
                                    }, function (err) {
                                        console.log("Errrorrrrr-5 \n ERROR:%s", type, err);
                                        callback();
                                    })

                                    .then(function (all) {
                                        all.forEach(function (option) {
                                            var node = {};
                                            var hasError = false;

                                            option.getText()
                                                .then(function (text) {
                                                    var m = text.match(filterRegex);
                                                    node._id = (!m) ? text : m[1];
                                                    node.children = [];
                                                }, function (err) {
                                                    hasError = true;
                                                    console.log("can not extract node text of type " + type + " error: " + err);
                                                })

                                                .then(function () {
                                                    return option.getAttribute('href');
                                                }, function (err) {
                                                    hasError = true;
                                                    console.error("can not resolve href of " + node._id + " error: " + err);
                                                })

                                                .then(function (url) {
                                                    if (!hasError) {
                                                        node.filter = type;
                                                        node.url = url;
                                                        node.ignoreList = {};
                                                        node.parent = (isRoot) ? null : item;
                                                        node.Multi = false; //isMulti;

                                                        if (isRoot)
                                                            roots.push(node);

                                                        if (!isRoot)
                                                            item.children.push(node);

                                                        // console.log("ITEM...");
                                                        /// console.log(item);
                                                        ///console.log("NODE...");
                                                        /// console.log(node);
                                                        queue.push(node);
                                                    }
                                                    //console.log(link);
                                                }, function (err) {
                                                    console.log("Errrorrrrr-6 \n ERROR:%s", type, err);

                                                });
                                        });
                                    }/*, function (err) {
                                     console.log("fail in type: " + type + " errors: " + err);
                                     }*/);
                            });

                        }
                        catch (e) {
                            if (e.getMessage().contains("element is not attached")) {
                                breakIt = false;
                                console.log("stale element error!!!!!!!!! >>>> = %s ", e.getMessage());
                            }
                        }
                        if (breakIt) {
                            break;
                        }

                    }
                }/*, function (err) {
                 console.error("fail in page " + item.url + " error: " + err);
                 }*/)

                .then(function () {

                    updateIgnoreList(queue, tempIgnoreList);
                    console.log("please wait while collecting category info may take few minutes...");
                    console.log("queue.length =" + queue.length);
                    callback();
                }, function (err) {
                    console.log("Errrorrrrr-7 \n ERROR:%s", type, err);
                }), function (err) {
                console.log("Errrorrrrr-8 \n ERROR:%s", type, err);
            };

        },
        function () {
            return queue.length > 0;
        },
        function (err) {
            if (err)
                return console.error("error occurs while updating" + err);

            prepareNodesForUpdate(roots);

            console.log("scan items completed successfully...");
        }
    );
}

exports.populateProducts = function (query) {

    Node.find(query, function (err, roots) {

        if (err)
            return console.log("errors occurs while getting root nodes: " + err);

        var breakIt = true;
        while (true) {
            breakIt = true;
            try {
                // write your code here

                var driver = getDriver();

                //for(var j=0;j<roots.length;j+=100){
                //
                //}
                var tasks = [];
                var nodePart = [];


                //for (var i = 0; i < 100; i++) {
                //  nodePart.push(roots[i]);
                //}

                roots.forEach(function (node, index) {

                    tasks.push(function (cb) {

                        console.log(">>>>>>" + index);

                        var q = [node];
                        var s = '?p='+ (parseInt(node.lastPageLoaded) + 1);
                        console.log("==================================");
                        console.log("node._id = %s  node.filter = %s", node._id, node.filter);
                        console.log("node.url = %s ", node.url);
                        console.log("node.children = %s ", node.children);
                        console.log("==================================");
                        node.url = node.url.concat(s);
                        while (q.length > 0) {
                            var n = q.shift();

                            n.children.forEach(function (c) {
                                q.push(c);
                                console.log("==================================");
                                console.log("child._id = %s  child.filter = %s", c._id, c.filter);
                                console.log("child.url = %s ", c.url);
                                console.log("child.children = %s ", c.children);
                                console.log("==================================");
                            });

                            driver.get(node.url)
                                .then(function () {
                                    return driver;
                                })
                                .then(paginationInfo)
                                .then(function (p) {
                                    //console.log("==================================");
                                    console.log("Category have:" + p + " pages");
                                    console.log("==================================");
                                    return populateProductsWithFilter(driver, p, node);
                                }).then(function () {
                                    cb();
                                });
                        }
                    });
                });
            } catch (e) {
                if (e.getMessage().contains("element is not attached")) {
                    breakIt = false;
                }
            }
            if (breakIt) {
                break;
            }

        }


        async.series(tasks, function (err) {
            if (err) {
                return console.error("error occurs while executing populating: " + err);
            }
            console.log("products population completed successfully.");
            process.exit(0);
        });
    });
}

exports.updateProductDetails = function (query) {

    query.hasDetails = false;

    Product.find(query, function (err, products) {

        if (err) {
            console.error("can not fetch products: %s", err);
            return;
        }

        var driver = getDriver();
        var tasks = [];
        var total = products.length;
        var currentIdx = 0;
        console.log("Total products items to load: " + total);

        products.forEach(function (product) {

            if (!product.url)
                return;

            tasks.push(function (cb1) {
                var updated = {};
                var ignore = false;
                var ignore2 = false;

                currentIdx++;
                driver.sleep(1000)
                driver.get(product.url)

                    .then(function () { // brand
                        return driver.findElement(By.xpath("//*[@id='bLogo']/a/img"));
                    })
                    .then(function (e) {
                        return e.getAttribute('src');
                    }, function (err) {
                        ignore = true;
                        console.error("updateProductDetails: can not extract brand for product._id " + product._id);
                        //cb1(err);
                    })
                    .then(function (value) {
                        //console.log(" brand :%s" + value);

                        if (!ignore)
                            updated.brand = value;
                    })
                    // category
                    .then(function () {
                        return driver.findElement(By.xpath('//*[@id="breadcrumbs"]/a[1]'));
                    }, function (err) {
                        ignore = true;
                    })
                    .then(function (category) {
                        return category.getText();
                    }, function (err) {
                        ignore = true;
                    })
                    .then(function (c) {
                        if (!ignore)
                            updated.category = c;
                    })
                    // subCategory
                    .then(function () {
                        return driver.findElement(By.xpath('//*[@id="breadcrumbs"]/a[2]'));
                    }, function (err) {
                        ignore = true;
                    })
                    .then(function (subCategory) {
                        return subCategory.getText();
                    }, function (err) {
                    })
                    .then(function (sc) {
                        if (!ignore)
                            updated.subCategory = sc;
                    })
                    // Video
                    .then(function () {
                        return driver.findElement(By.xpath('//*[@id="vertical-video"]'));
                    })
                    .then(function (video) {
                        return video.getAttribute('href');
                    }, function () {
                        ignore2 = true;
                        //console.error("updateProductDetails: no video for product._id " + product._id + " error: " + err);
                        console.log("updateProductDetails: no video for product._id " + product._id);
                    })
                    .then(function (videoHref) {
                        if (!ignore2) {
                            updated.videomp4 = videoHref;
                            updated.videoflv = videoHref.replace('.mp4', '.flv');
                        } else {
                            updated.videomp4 = updated.videoflv = 'none';
                        }
                    })
                    .then(function () { // description
                        return driver.findElement(By.xpath("//*[@id='productDescription']/div"));
                    })
                    .then(function (e) {
                        return e.getAttribute('innerHTML');
                    }, function (err) {
                        ignore = true;
                        console.error("updateProductDetails: can not extract description for product._id " + product._id + " error: " + err);
                        //cb1(err);
                    })
                    .then(function (description) {
                        if (!ignore) {
                            var tmp = description.replace(/zappos.com/g, 'mooza.club');
                            updated.description = tmp.replace(/Zappos.com/g, 'Mooza.club');
                        }
                    })
                    .then(function () {
                        if (!ignore) {
                            //console.log("updateProductDetails 1");
                           getVariations(driver, updated, function (err) {
                             ignore = true;
                             console.error("updateProductDetails: can not extract variations for product._id " + product._id + " error: " + err);
                              //cb1(err);
                             });
                            //console.log("updateProductDetails 2");

                        }
                    }, function (err) {
                        ignore = true;
                        console.log("updateProductDetails 3");
                        console.error("updateProductDetails: variation error: " + err);
                        //cb1(err);
                    })
                    .then(function () {
                        //console.log("updateProductDetails 4");
                        updated.hasDetails = true;
                        updated.hasError = ignore;
                        updated.isLocked = ignore;

                        Product.update({_id: product._id}, updated, {}, function (err) {
                            if (err) {
                                console.error("updateProductDetails: error occurs while trying update details of product._id: " + product._id);
                                //return cb1(err);
                                console.log("updateProductDetails 5");
                                return cb1();
                            }

                            //console.log("updateProductDetails 6");
                            console.log("updateProductDetails: completed successfully for product._id:%s (%s/%s)", product._id, currentIdx, total);
                            cb1();
                        });
                    });
            });
        });

        async.series(tasks, function (err, result) {
            if (err) {
                return console.log(err);
            }

            console.log("updateProductDetails: successfully updated products: " + result.length);
            process.exit(0);
        });

    });
}

exports.fetchImages = function (query) {

    query.isDownload = false;
    query.hasError = false;
    query.hasDetails = true;
    query.brand = {$exists: true};


    console.log("Zak query:", query);

    Product.find(query, function (err, products) {

        if (err) {
            return console.error("can not fetch products: %s", err);
        }

        var tasks = [];
        var index = 0;

        products.forEach(function (product) {

            tasks.push(function (cb) {

                var tasks1 = [];
                var updated = {
                    variations: product.variations,
                    brand: product.brand,
                    videomp4: product.videomp4,
                    videoflv: product.videoflv
                };
                console.log('pid:' + product._id);

                if (updated.videomp4 !== 'none') {
                    tasks1.push(function (cb2) {
                        saveImages(updated.videomp4, function (err, file) {
                            if (err)
                                return cb2(err);

                            var loc = file.indexOf('assets');
                            var fstr1 = slash(file.slice(loc));
                            updated.videomp4 = fstr1;
                            cb2();
                        });
                    });
                }
                if (updated.videoflv !== 'none') {
                    tasks1.push(function (cb2) {
                        saveImages(updated.videoflv, function (err, file) {
                            if (err)
                                return cb2(err);

                            var loc = file.indexOf('assets');
                            var fstr1 = slash(file.slice(loc));
                            updated.videoflv = fstr1;
                            cb2();
                        });
                    });
                }

                if (updated.brand) {

                    tasks1.push(function (cb2) {
                        saveImages(updated.brand, function (err, file) {
                            if (err)
                                return cb2(err);

                            var loc = file.indexOf('assets');
                            var fstr = slash(file.slice(loc));
                            updated.brand = fstr;
                            cb2();
                        });
                    });
                }

                updated.variations.forEach(function (variation, i) {
                    variation.values.forEach(function (value, k) {
                        try{
                            if (value.searchImg.indexOf('-p-LARGE_SEARCH.jpg') > 0) {

                                tasks1.push(function (cb2) {
                                    saveImages(value.searchImg, function (err, file) {
                                        if (err)
                                            return cb2(err);

                                        var loc = file.indexOf('assets');
                                        var fstr = slash(file.slice(loc));
                                        updated.variations[i].values[k].searchImg = fstr;
                                        cb2();
                                    });
                                });
                            }
                        }
                        catch(e)
                        {
                            console.log(e);
                        }

                        value.thumbnails.forEach(function (thumb, j) {

                            if (!thumb) return;

                            tasks1.push(function (cb2) {
                                saveImages(thumb, function (err, file) {
                                    if (err)
                                        return cb2(err);

                                    //console.log("thumb file:", file);
                                    var loc = file.indexOf('assets');
                                    var fstr = slash(file.slice(loc));
                                    //console.log("thumb file after:", fstr);
                                    updated.variations[i].values[k].thumbnails[j] = fstr;
                                    cb2();
                                });
                            });
                        });

                        value.zoomedImg.forEach(function (Zimage, index) {

                            if (!Zimage) return;

                            tasks1.push(function (cb2) {
                                saveImages(Zimage, function (err, file) {
                                    if (err)
                                        return cb2(err);

                                    //console.log("image file:", file);
                                    var loc = file.indexOf('assets');
                                    var fstr = slash(file.slice(loc));
                                    updated.variations[i].values[k].zoomedImg[index] = fstr;
                                    cb2();
                                });
                            });
                        });

                        value.mobileImg.forEach(function (Mimage, index) {

                            if (!Mimage) return;

                            tasks1.push(function (cb2) {
                                saveImages(Mimage, function (err, file) {
                                    if (err)
                                        return cb2(err);


                                    var loc = file.indexOf('assets');
                                    var fstr = slash(file.slice(loc));
                                    updated.variations[i].values[k].mobileImg[index] = fstr;
                                    cb2();
                                });
                            });
                        });

                        value.images.forEach(function (image, index) {

                            if (!image) return;

                            tasks1.push(function (cb2) {
                                saveImages(image, function (err, file) {
                                    if (err)
                                        return cb2(err);

                                    //console.log("image file:", file);
                                    var loc = file.indexOf('assets');
                                    var fstr = slash(file.slice(loc));
                                    updated.variations[i].values[k].images[index] = fstr;
                                    cb2();
                                });
                            });
                        });
                    })
                });

                async.series(tasks1, function (err) {
                    if (err) {
                        console.error("Product_id: " + product._id + " error occurs while download images: " + err);
                        return cb(err);
                    }

                    updated.isDownload = true;

                    Product.update({_id: product._id}, updated, {}, function (err) {
                        if (err) {
                            console.error("Product_id: " + product._id + " >> error occurs while download images: " + err);
                            return cb(err);
                        }

                        console.log("images download completed successfully for product._id: %s", product._id);
                        cb();
                    });
                });
            });
        });

        async.parallel(tasks, function (err, results) {
            if (err)
                return console.error(index + " error occurs while downloading images: " + err);

            console.log("download images completed successfully... total: " + results.length);
            process.exit(0);
        });
    });
};
