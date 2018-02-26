const image_dir = './images/'; //absolute path with slash at the end

module.exports = new class httpServer {
    constructor() {

    }

    get_test(req, res) {

        res.send('GET')
    }


    get_catalogs(req, res) {
        console.log('get_catalogs');
        r.table('catalogs').orderBy('name').run(conn, (err, data) => {
            if(err) {
                res.status(500).end(err);
                return;
            }
            data.toArray((err, catalogs) => {
                res.end(JSON.stringify(catalogs));
            })
        });
    }

    post_product(req, res) {
        let data;
        try {
            data = JSON.parse(req.body.data);

            console.log(data);
            if(data.id) {
                console.log('get by id', data.id);
                r.table('products').get(data.id).merge((product) => {
                    return {
                        prices: r.table('prices').get(product('id'))
                    }
                }).run(conn, (err, data) => {
                    if(err) {
                        console.log('Error', err);
                        return;
                    }

                    if(data.id) {
                       res.end(JSON.stringify(data));
                    } else {
                        res.status(404).end("not found");
                    }
                })
            } else {
                console.log('get by extra', data.extra_id);
                r.table('products').filter({extra_id: data.extra_id}).merge((product) => {
                    return {
                        prices: r.table('prices').get(product('id'))
                    }
                }).run(conn, (err, data) => {
                    if (err) {
                        console.log('Error', err);
                        return;
                    }

                    data.toArray((err, data) => {
                        if(err) {
                            console.log('data error', err);
                            res.status(500).end("Server error");
                            return;
                        }
                        if(data[0] === undefined) {
                            res.status(404).end("not found");
                            return;
                        }
                        //extra id is unique, send first element
                        if(data[0].id) {
                            res.end(JSON.stringify(data[0]));
                        } else {
                            res.status(404).end("not found");
                        }
                    })
                });
            }
        } catch(e) {
            console.error(e);
            res.status(500).end("Server error");
        }
    }

    post_products(req, res) {
        let data;
        try {
            data = JSON.parse(req.body.data);
            console.log(data);


            let query = r.table('products');
            if(data.catalog) {
                query = query.filter({catalog_id: data.catalog})
            }

            for(let key in data.filter) {
                query = query.filter(function(product) {
                    return product("filters")("id").contains(key)//filter key
                });

                let values = [];
                for(let filter_id in data.filter[key]) {
                    values.push(`${data.filter[key][filter_id].id}`);
                }

                query = query.filter((function(product) {
                    return product("filters")("values").contains(function(f) {
                        return f.contains(values.join(','))//filter[index].id
                    })
                }))
            }


            let total_query = query;

            if(data.skip !== undefined && data.limit !== undefined) {
                query = query.skip(data.skip);
                query = query.limit(data.limit);
            }

            query = query.merge(function(product) {

                return {
                    price: r.db('ateuco').table('prices').get(product("id"))
                }

            });

            query.run(conn, (err, data) => {
                if(err) {
                    console.log('Error', err);
                    return;
                }

                data.toArray((err, products) => {
                    if(err) {
                        req.status(500).end("Server error");
                        return;
                    }

                    total_query.count().run(conn, (err, count) => {
                        let result = {
                            total: count,
                            products: products,
                        }
                        console.log(products.length);
                        res.end(JSON.stringify(result));
                    })


                })
            });

        } catch (err) {
            console.log(err);
            res.status(500).end("Parse error");
        }



    }

    post_pricesync(req, res) {

        console.log('price sync');
        r.table('prices').delete().run(conn, (err, data) => {
            if(err) {
                console.error(err);
                res.end(err);
            }

            try {
                console.log('price table update');
                r.table('prices').delete().run(conn, (err, data) => {
	                r.table('prices').insert(req.body[1].prices).run(conn, (err, data) => {
		
		                if(err) {
			                console.log('price sync error: ', err);
			                res.status(500).end('update error');
			                return;
		                }
		
		                r.table('price_types').delete().run(conn, (err, data) => {
			                r.table('price_types').insert(req.body[0].price_types).run(conn, (err, data) => {
				                if(err) {
					                console.log('price sync error: ', err);
					                res.status(500).end('update error');
				                }
			                });
		                });
		
		
		                console.log("prices saved");
		                res.end("OK");
	                });
                });
               
            } catch (e) {
                res.status(500).end("Parse error");
            }
        })

    }

    post_imagessync(req, res) {
        
        //console.log(req.body);
        r.table('images').delete().run(conn, (err, data) => {
            if(err) {
                console.error(err);
                res.end(err);
            }

            r.table('images').insert(req.body).run(conn, (err, data) => {
                res.send("OK");
                res.end();
            });

        });
    }

    post_images(req, res) {
        let fs = require('fs'),
            decode64 = require('base-64').decode;
        console.log('upload request');
        const multer = require('multer');
        const path = require('path');
        let filename,
            dirname = process.cwd();


       /* console.log(JSON.stringify(req.body));


        fs.writeFile('./uploads/images.zip', req.body.Body, (err) => {
            if(err) {
                console.log(err);
                res.status(500).end('Error uploading file' + "\r\n\r\n" + err);
                return;
            }

            console.log('zip saved');
            res.end("OK");
        })*/

        let storage = multer.diskStorage({
            destination: function(req, file, callback) {
                callback(null, dirname + "/uploads/");
            },
            filename: function(req, file, callback) {
                console.log(file);
                filename = Date.now() + file.originalname;
                callback(null, filename);
            }
        });

        let upload = multer({
            //storage: storage,
            dest: './uploads'
        }).single('file');

        upload(req, res, function(err) {
            //console.log(res);
            console.log('upload start');
            console.log(req.file);



            //var data = fs.readFileSync(req.file.path, 'base64');
            //var buffer = new Buffer(data, 'base64');

            //fs.writeFileSync('./uploads/images.zip', decode64(buffer), 'binary')


            //fs.createReadStream(req.file.path)
            if(err) {
                console.log(err);
                res.status(500).end('Error uploading file' + "\r\n\r\n" + err);
                return;
            }

            const extract = require('extract-zip');
            //extract(dirname + '/uploads/images.zip', {dir: process.cwd() + "/images/"}, function (err) {
            extract(req.file.path, {dir: __dirname + "/images/"}, function (err) {
                if(err) {
                    console.error(err);
                    res.status(500).send("can't get file");
                    return;
                }
                console.log('extract done');
                res.send('File is uploaded')

            });
        })
    }

    post_productsync(req, res) {

        r.table('products').delete().run(conn, (err, data) => {
            if(err) {
                console.log('Error', err);
                res.status(500).send('Server error');
                return;
            }

            req.body.forEach((product) => {

                r.table('products').insert(product).run(conn, (err, data) => {
                    if(err) {
                        console.log('Error', err);
                        res.status(500).send('Server error: ' + err);
                        return;
                    }
                })
            });
            console.log('add indexes');
            let algolia = require('algoliasearch');
            let client =  algolia('C1WQ7KERHP', 'cedab8e10706271bcec5853128adcd6a');
            let index = client.initIndex('ateuco');

            index.clearIndex('ateuco', (err, content) => {
                if(err) {
                    console.erorr(err);
                } else {
                    console.log(content);

                    index.addObjects(req.body, function(err, content) {
                        if (err) {
                            console.error(err);
                        }

                        res.end("OK");
                        //console.log(content);
                    });
                }
            });


            res.send("OK");
        })
    }

    post_catalogsync(req, res) {

        r.table('catalogs').delete().run(conn, (err, data) => {

            if(err) {
                console.log('Error', err);
                res.status(500).send('Server error');
                return;
            }

            req.body.catalogs.forEach((catalog) => {
                console.log(catalog);
                r.table('catalogs').insert({
                    id: catalog.id.toString(),
                    name: catalog.name,
                    filters: catalog.filters
                }).run(conn, (err, data) => {
                    if(err) {
                        console.log('Error', err);
                        res.status(500).send('Server error: ' + err);
                        return;
                    }


                });
            });
            res.send("OK");
        });


    }


};