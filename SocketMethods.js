module.exports = class SocketMethods {

    constructor() {}

    get_product(socket, data) {
        console.log('get_product', data);

        if(data.id) {
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
                    socket.emit('product', data);
                }
            })
        } else if(data.extra_id) {

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
                        return;
                    }
                    //extra id is unique, send first element
                    //console.log(data[0]);
                    socket.emit('product', data[0]);
                })
            });
        }
    }

    get_catalog_list(socket, data) {

        console.log('get_catalog_list');
        r.table('catalogs').orderBy('name').run(conn, (err, data) => {
            if(err) {
                console.log('Error', err);
                return;
            }
            data.toArray((err, catalogs) => {
                socket.emit('catalog_list', catalogs);
            })
        });

    }


    get_product_list(socket, data) {

        //input
        /*
        {
  "43a0ee2f-5c01-11e7-921d-448a5b63a3a9": [
    {
      "id": "fbb5e5bb-7360-11e7-8637-448a5b63a3a9",
      "name": "Аккумуляторы"
    },
    {
      "id": "bb339a03-8645-11e7-9b91-448a5b63a3a9",
      "name": "Дисплеи"
    },
    {
      "id": "aed2509b-711d-11e7-ae61-448a5b63a3a9",
      "name": "Шлейфы"
    }
  ],
  "43a0ee2d-5c01-11e7-921d-448a5b63a3a9": [
    {
      "id": "a1ef97c1-80ca-11e7-83a0-448a5b63a3a9",
      "name": "Datalogic"
    }
  ],
  "43a0ee2e-5c01-11e7-921d-448a5b63a3a9": [
    {
      "id": "a1ef97c2-80ca-11e7-83a0-448a5b63a3a9",
      "name": "Falcon 4410"
    }
  ]
}

         */
        //filter 1
       /* r.db('ateuco').table('products').filter(function(product) {
            return product("filters")("id").contains("zzzzzzz")//filter key
        }).filter((function(product) {
            return product("filters")("values").contains(function(f) {
                return f.contains("fbb5e5d3-7360-11e7-8637-448a5b63a3a9", 'fbb5e5d4-7360-11e7-8637-448a5b63a3a9')//filter[index].id
            })
        }))*/

            //filter 2
         /*   .filter(function(product) {
            return product("filters")("id").contains("qqqq")
        }).filter((function(product) {
            return product("filters")("values").contains(function(f) {
                return f.contains("5ca9e39c-71cc-11e7-8c4a-448a5b63a3a9")
            })
        }))



        console.log();*/

        //filter 3
        //filter N



        console.log('get_product_list');
        //console.log(data);
        let query = r.table('products');
        if(data.catalog) {
            query = query.filter({catalog_id: data.catalog})
        }

        for(let key in data.fitered) {
            //console.log('filter key', key);
            query = query.filter(function(product) {
                return product("filters")("id").contains(key)//filter key
            });

            let values = [];
            for(let filter_id in data.fitered[key]) {
                values.push(`${data.fitered[key][filter_id].id}`);
            }
            //console.log('filter value', values);

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
        //console.log(query.toString());


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
                //console.log(products);
                //console.log(products);
                total_query.count().run(conn, (err, count) => {
                    let result = {
                        total: count,
                        products: products,
                    };
                    socket.emit('product_list', result);
                })

            })
        })
    }
};