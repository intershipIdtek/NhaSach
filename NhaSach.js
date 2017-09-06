var express = require('express'),
    app = express(),
    http = require('http');

var MongoClient = require('mongodb').MongoClient,
    url = "mongodb://localhost:27017/Sach";

var bodyParser = require('body-parser'),
    Passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    session = require('express-session');

var mongo = require('./database/mongo');
var sleep = require('system-sleep');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "anything", cookie: { maxAge: 1000 * 60 * 5 } }));
app.use(Passport.initialize());
app.use(Passport.session());

app.use(express.static('public'));

app.route('/login')
    .post(Passport.authenticate('local', {
        successRedirect: '/front_end/view/Trang_chu.htm',
        failureRedirect: '/front_end/view/login.htm',
        failureFlash: true
    }));

Passport.use(new LocalStrategy(
    function (username, password, done) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            db.collection("User").findOne({ "usr": username }, function (err, result) {
                if (err) throw err;
                var userRecord = result;
                if (userRecord && userRecord.pwd === password) {
                    return done(null, userRecord);
                }
                else {
                    return done(null, false);
                }
                db.close();
            })
        })
    }
))
Passport.serializeUser(function (user, done) {
    done(null, user.usr);
});
Passport.deserializeUser(function (name, done) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection("User").findOne({ "usr": name }, function (err, result) {
            if (err) throw err;
            var userRecord = result;
            if (userRecord) {
                return done(null, userRecord);
            } else {
                return done(null, false);
            }
            db.close();
        })
    })
});

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    db.collection("NhaSach").findOne({ book_store: "nhà sách Nguyễn Văn Cừ" }, function (err, result) {
        if (err) throw err;
        all_book_array = result.all_books;
        db.close();
    });
});
//logout user
app.get('/logout', function (req, res) {

    req.logOut(req.user);
    res.redirect('/front_end/view/Trang_chu.htm')
});
//cat nhat tinh trang user
app.get('/welcome_back_request', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    })
    var user_info = " "
    if (req.isAuthenticated()) {
        user_info = req.user.usr;
    }
    res.end(JSON.stringify(user_info));
})
//tìm sách theo tên
function bodauTiengViet(str) {
    str = str.toString().toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str;
}
app.get('/searchBook', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    var bookNameSearch = req.query.bookNameSearch;

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection("NhaSach").findOne({ book_store: "nhà sách Nguyễn Văn Cừ" }, function (err, result) {
            if (err) throw err;
            var allBookArray = result['all_books'];
            var i = 0, data1, data2, data3;
            var array_book = [];
            while (i < allBookArray.length) {
                var j = 0;
                data1 = allBookArray[i].book_name.split(" ");
                data3 = bodauTiengViet(allBookArray[i].book_name).split(" ");
                while (j < data1.length) {
                    data2 = bookNameSearch.split(" ");
                    var k = 0;
                    while (k < data2.length) {
                        if (data1[j].toLowerCase() == data2[k] || data1[j] == data2[k] || data3[j].toLowerCase() == data2[k] || data3[j] == data2[k]) {
                            if (!(array_book.includes(allBookArray[i])))
                                array_book.push(allBookArray[i]);
                        }
                        k++;
                    }
                    j++;
                }
                i++;
            }
            if (!array_book) res.end(JSON.stringify(""));
            else res.end(JSON.stringify(array_book));
        });
        db.close();
    });
});
//thêm sách
app.get('/insert_get', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    //
    var id_of_book = req.query.id_of_book,
        name = req.query.name,
        artist = req.query.artist,
        num_of_day = req.query.num_of_day,
        type = req.query.type,
        image = req.query.image;
    if (req.isAuthenticated()) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            db.collection("NhaSach").update({ book_store: "nhà sách Nguyễn Văn Cừ" },
                {
                    "$push":
                    {
                        "all_books":
                        {
                            "id": id_of_book,
                            "type": type,
                            "image": image,
                            "book_name": name,
                            "artist": artist,
                            "price_per_day": num_of_day
                        }
                    }
                });
            sleep(100);
            db.collection("NhaSach").findOne({}, function (err, result) {
                if (err) throw err;
                var all_book_array = result.all_books;
                res.end(JSON.stringify(all_book_array));
                db.close();
            });
        })

    }
});
//xóa sách
app.get('/delete_get', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    var name_xoa = req.query.name_xoa;
    var all_book_array = [];
    if (req.isAuthenticated()) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            db.collection("NhaSach").update({ book_store: "nhà sách Nguyễn Văn Cừ" },
                {
                    "$pull":
                    {
                        "all_books":
                        {
                            "book_name": name_xoa
                        }
                    }
                });
            sleep(100);
            db.collection("NhaSach").findOne({}, function (err, result) {
                if (err) throw err;
                all_book_array = result.all_books;
                res.end(JSON.stringify(all_book_array));
                db.close();
            });
        });
    }
});
//tìm sách theo thể loại
app.get('/type_get', function (req, res) {
    res.set(
        {
            'content-type': 'application/json; charset=utf-8'
        });
    if (req.isAuthenticated()) {
        var type_book = req.query.type_book;
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            db.collection("NhaSach").aggregate([
                { $unwind: "$all_books" },
                { $match: { "all_books.type": type_book } },
                {
                    $project: {
                        _id: 0,
                        book_name: "$all_books.book_name",
                        price_per_day: "$all_books.price_per_day",
                        type: "$all_books.type",
                        image: "$all_books.image",
                        id: "$all_books.id",
                        artist: "$all_books.artist"
                    }
                }
            ], function (err, result) {
                if (err) throw err;
                res.end(JSON.stringify(result));
            });
        });
    };
});
//load sách cho khách hàng
app.get('/load_get', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection("NhaSach").findOne({ book_store: "nhà sách Nguyễn Văn Cừ" }, function (err, result) {
            if (err) throw err;
            all_book_array = result.all_books;
            res.end(JSON.stringify(all_book_array));
            db.close();
        });
    });
});
//thuê
app.get('/shopping_cart_1', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    var checkbox = req.query.checkbox;
    var book_temp;
    if (req.isAuthenticated()) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var select_book = [];
            db.collection("NhaSach").findOne({ book_store: "nhà sách Nguyễn Văn Cừ" }, function (err, result) {
                if (err) throw err;
                all_book_array = result['all_books'];
                //lặp từng giá trị
                checkbox.forEach(function (element) {
                    all_book_array.forEach(function (book) {
                        if ((element) == book.id) {
                            select_book.push(book); //so sánh tìm id thích hợp                        
                        }
                    });
                }); sleep(100);
                db.collection("Temp").insertOne({ name_customer: req.user.usr, all_books: select_book, book_aray: all_book_array }, function (err, result) {
                    if (err) throw err;
                    res.end(JSON.stringify(select_book));
                    db.close();
                });

            });
        });
    };
});
//thuê thêm
app.get('/shopping_cart_2', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    var checkbox = req.query.checkbox;
    var name = req.query.name;
    var sdt_customer = req.query.sdt_customer;
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var select_book = [];
        db.collection("NhaSach").findOne({ book_store: "nhà sách Nguyễn Văn Cừ" }, function (err, result) {
            if (err) throw err;
            all_book_array = result.all_books;
            //lặp từng giá trị
            checkbox.forEach(function (element) {
                all_book_array.forEach(function (book) {
                    if ((element) == book.id) {
                        select_book.push(book); //so sánh tìm id thích hợp                        
                    }
                });
            });
            sleep(100);
            if (req.isAuthenticated()) {
                db.collection("Temp").update({ name_customer: req.user.usr },
                    {
                        "$addToSet":
                        { all_books: { "$each": select_book } }
                    });
                sleep(100);
                db.collection("Temp").findOne({ name_customer: req.user.usr }, function (err, result) {
                    if (err) throw err;
                    book_result = result.all_books;
                    res.end(JSON.stringify(book_result));
                    db.close();
                })
            }
            db.close();
        });
    });
});
//thanh toán tiền
app.get('/pay_off', (req, res) => {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        if (req.isAuthenticated()) {
            db.collection('Temp').findOne({ name_customer: req.user.usr }, function (err, result) {
                if (err) throw err;
                var ketqua, price, sum = 0;
                ketqua = result.all_books;
                ketqua.forEach(function (e) {
                    sum = sum + Number(e.price_per_day);
                });
                sleep(100);
                var response = {
                    'user': req.user.usr,
                    'ketqua': ketqua,
                    'price': sum
                };
                setTimeout(() => {
                    db.collection('Customer').insertOne(response, (err, result) => {
                        if (err) throw err;
                        db.close();
                    });
                }, 1000);
                res.end(JSON.stringify(response));
                db.close();
            });
        };
    });
});
//tải lại sách
app.get('/reload_book', (req, res) => {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    if (req.isAuthenticated()) {
        MongoClient.connect(url, (err, db) => {
            if (err) throw err;
            db.collection("Temp").findOne({ name_customer: req.user.usr }, (err, result) => {
                if (err) throw err;
                select_book = result['all_books'];
                db.collection('Temp').update({ name_customer: req.user.usr },
                    {
                        '$pull': { book_aray: { '$in': select_book } }
                    }); sleep(100);
                db.collection('Temp').findOne({ name_customer: req.user.usr }, (err, result) => {
                    if (err) throw err;
                    book_exist = result['book_aray'];
                    res.end(JSON.stringify(book_exist));
                    db.close();
                });
                db.close();
            });
        });
    };
});
//hủy sách trong giỏ hàng
app.get('/delete_book', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    var delete_id = req.query.delete_id;
    var select_book;//đây là mảng chọn ra sách muốn xóa 
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection("NhaSach").findOne({ book_store: "nhà sách Nguyễn Văn Cừ" }, function (err, result) {
            if (err) throw err;
            all_book_array = result.all_books;
            //lặp từng giá trị
            all_book_array.forEach(function (book) {
                if (delete_id == book.id) {
                    select_book = book; //so sánh tìm id thích hợp                        
                }
            });
            if (req.isAuthenticated()) {
                db.collection('Temp').update({ name_customer: req.user.usr },
                    {
                        '$pull': { all_books: { '$in': [select_book] } }
                    });
                db.collection('Temp').update({ name_customer: req.user.usr },
                    {
                        '$push':
                        {
                            "book_aray":
                            {
                                "id": select_book.id,
                                "type": select_book.type,
                                "image": select_book.image,
                                "book_name": select_book.book_name,
                                "artist": select_book.artist,
                                "price_per_day": select_book.price_per_day
                            }
                        }
                    });
                sleep(100);
                db.collection("Temp").findOne({ name_customer: req.user.usr }, function (err, result) {
                    if (err) throw err;
                    var response = { 'book_result': result['all_books'], 'book_exist': result['book_aray'] }
                    res.end(JSON.stringify(response));
                    db.close();
                })
                db.close();
            };
        });
    });
});
//đăng ký user
app.get('/create_user', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    var input_username = req.query.input_username,
        input_password = req.query.input_password;
    var input_user = { usr: input_username, pwd: input_password };
    mongo.collection("User")
        .add([input_user])
        .onSuccess(() => { console.log("dang ky thanh cong") })
        .onError((err) => { console.log(err + "") })
        .perform();
    sleep(100);
});
//load sach random Trang chu
app.get('/random_books', function (req, res) {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    var number_show = 6,
        random_number_array = [],
        random_book_array = [];
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        db.collection("NhaSach").findOne({ book_store: "nhà sách Nguyễn Văn Cừ" }, function (err, result) {
            all_book_array = result.all_books;
            while (random_number_array.length < number_show) {
                var random_number = Math.floor(Math.random() * all_book_array.length);
                if (random_number_array.includes(random_number)) {
                    continue;
                }
                random_number_array.push(random_number);
                random_book_array.push(all_book_array[random_number]);
            }
            res.end(JSON.stringify(random_book_array));
            db.close();
        })
    })
})
//
app.get('/check_cart', (req, res) => {
    res.set({
        'content-type': 'application/json; charset=utf-8'
    });
    if(req.isAuthenticated()){
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            db.collection('Temp').findOne({name_customer:req.user.usr},(err,result)=>{
                if(err) throw err;
                res.end(JSON.stringify(result['all_books']));
                db.close();
            })
        });
    }

});
app.get('/front_end/view/*', function (req, res) {
    var file_to_send = req.params[0];
    res.sendFile(__dirname + "/front_end/view/" + file_to_send);
});
//
var server = app.listen(8081, function () {
    var host = 'localhost'
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
});

