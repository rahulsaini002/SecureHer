require("dotenv").config();
const express = require("express");
const path = require("path");
// VVubYTIb2vbCOvga
// file system ( sync or async)
const fs = require('fs');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// used for authentication purpose
const cookieParser = require('cookie-parser')
const session = require('express-session');

// file upload things ( multiple )
const fileUpload = require('express-fileupload');
// with fileUpload for safety
const multer = require('multer');
const mkdirp = require('mkdirp');
const busboy = require('connect-busboy');

const nodemailer = require('nodemailer');

const users = require('./models/users');
const complaints = require('./models/complaints');
const port = process.env.PORT || 4000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));


app.use(express.static(path.join(__dirname, '/public')));


const uri = `mongodb+srv://hritikkhurana10sm:Parth@cluster0.fwkqt.mongodb.net/?retryWrites=true&w=majority`
// const uri = process.env.MONGO_URI

// mongoose connection
mongoose
  .connect(uri, {
    useNewUrlParser: true
  })
  .then(() => {
    console.log("DataBase Connected Successfully");
  })
  .catch(err => console.log(err));





// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

const adminRoutes = require('./routes/admin.js');
app.use('/admin', adminRoutes);

app.use(cookieParser());

app.use(fileUpload()); // important for the upload of the multiple files

// express session 
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));


// main.ejs  ( signup and signin page)
app.get('/', async (req, res) => {
    res.render('main.ejs');
});



// signup.ejs
app.post('/signUp', async (req, res) => {

    res.cookie('isLogined', false);
    
    var userBody = req.body;
    console.log("Sign Up Attemp =>", userBody);

    if (userBody.password) {
        var newUser = new users(
            { name: userBody.name, email: userBody.email, password: userBody.password, phone: userBody.phone }
        );

        await newUser.save()
            .then(newUser => {
                console.log(`${newUser} added`);
            })
            .catch(err => {
                console.log(err);
            });
        res.redirect('/');
    }
    else {
        // document.alert(`passwords do not match`);
         res.redirect('/')
    }
});


// admin sign up (one time)
const admins  = require('./models/admins');

// api to register the admin of the page (usually one time task)
app.post('/adminRegister' , async(req ,res)=>{

      var userQuery = req.body;
      console.log('Admin Registration= > ' , userQuery);

      var admin = new admins(
        {name : userQuery.name , email : userQuery.email , password : userQuery.password , 
          bio : "Free From Fear" , department : "Security Officer" , phone : "+91-8795863257" }
      );

      await admin.save()
      .then(admin => {
        console.log(`${admin} added`);
      })
      .catch(err => {
        console.log(err);
      })
      res.redirect('/');
})


// login.ejs
app.post('/login', async (req, res) => {

    var userQuery = req.body;
    console.log(userQuery);

    try {
        if (userQuery.isAdmin) {
           
            var admin = await admins.findOne({ email: userQuery.email, password: userQuery.password }).exec();
            
            console.log('Admin LoggedIn =>' , admin);
            if (admin) {
                
                res.cookie('isLogined', true);
                res.cookie('isAdmin', true);
                res.cookie('adminId', admin._id);
                
                console.log("Req.Cookies Admin =>" , req.cookies);

                res.redirect('/admin/home');
            }
            else {
                // alert(`incorrect login datails`);
                res.send('login failed');
            }

        }
        else {
            var user = await users.findOne({ email: userQuery.email, password: userQuery.password }).exec();
            // console.log(`details ${userQuery.email} ${userQuery.password} hello `);
            if (user) {
                console.log('User LoggedIn=>', user);

                res.cookie('isLogined', true);
                res.cookie('userId', user._id);
                console.log(req.cookies);

                res.redirect('/home');
            }
            else {
                // alert(`incorrect login datails`);
                res.send('login failed');
            }
        }
    }
    catch (error) {
        return console.log('error', error);

    };
    console.log('after');
    // res.send('success');

});

// complaints.ejs
app.get('/allComplaints', async (req, res) => {
    try {
        var allComplaints = await complaints.find({}).exec();
        // console.log("1 = > " , allComplaints[0]);
        // console.log("2 => " , allComplaints);
        
        res.render('allComplaints.ejs', { allComplaints });

    }
    catch (error) {
        console.log('error', error);
    }
});



// home.ejs where all complaints will be shown
app.get('/home', async (req, res) => {

    var { isLogined = false } = req.cookies;
    if (isLogined !== 'true') {
        res.redirect('/');
    }
    else {
        var userId = req.cookies.userId;
        try {
            var user = await users.findById(userId).exec();

            var cssFiles = ['style.css.css', 'leftStage.css', 'centerStage.css', 'rightStage.css', 'home.css'];
           
            var complaintsList = await complaints.find({ authorEmail: user.email }).populate('authorId');
            // console.log(complaintsList);
            res.render('home.ejs', { user, complaintsList, cssFiles });

        } catch (error) {
            console.log('error', error);
        }
    }
});



// profile.ejs 
app.get('/profile', async (req, res) => {
    var { isLogined = false } = req.cookies;
    // req.session.isLogined=false;
    // console.log(req.session.isLogined);
    if (isLogined !== 'true') {
        res.redirect('/');

    }
    else {
        var userId = req.cookies.userId;
        try {
            var user = await users.findById(userId).exec();

            var cssFiles = ['style.css.css', 'leftStage.css', 'centerStage.css', 'rightStage.css', 'profile.css'];
            try {
                var complaintsList = await complaints.find({ authorEmail: user.email }).populate('authorId');
                // let keys = [];
                // let lPrice = "";
                // let hPrice = "";
                res.render('profile.ejs', { user, complaintsList, cssFiles });

            }
            catch (error) {
                console.log('error', error);
            }
        }
        catch (error) { console.log(error); }
    }
});

//safetytips.ejs
app.get('/safetytips', async (req, res) => {
    var { isLogined = false } = req.cookies;
    // req.session.isLogined=false;
    // console.log(req.session.isLogined);
    if (isLogined !== 'true') {
        res.redirect('/');

    }
    else {
        var userId = req.cookies.userId;
        try {
            var user = await users.findById(userId).exec();

            try {
               
                // let keys = [];
                // let lPrice = "";
                // let hPrice = "";
                var cssFiles = ['public\css\safetytips.css'];
                res.render('safetytips.ejs', { user, cssFiles });
            }
            catch (error) {
                console.log('error', error);
            }
        }
        catch (error) { console.log(error); }
    }
});
// app.get('/safetytips', async (req, res) => {
//     var { isLogined = false } = req.cookies;
//     // req.session.isLogined=false;
//     // console.log(req.session.isLogined);
//     if (isLogined !== 'true') {
//         res.redirect('/');
//     }
//     else {
//         var userId = req.cookies.userId;
//         try {
//             var user = await users.findById(userId).exec();
//             var cssFiles = ['style.css.css', 'leftStage.css', 'centerStage.css', 'rightStage.css', 'fileComplaint.css'];
//             res.render('fileComplaint.ejs', { user, cssFiles });
//         }
//         catch (error) { console.log(error); }
//     }
// });












app.post('/updateUserProfile', async (req, res) => {
    var { isLogined = false } = req.cookies;

    if (isLogined !== 'true') {
        res.redirect('/');
    }
    else {
        var userId = req.cookies.userId;
        try {
            var user = await users.findById(userId).exec();

            // console.log('after getting user', typeof (req.file), typeof(req.files), req.files);
            if (req.files == null) {

                var cpname = "";
                var dpname = "";
            } else {
                var dp = req.files.displayPic;
                var cp = req.files.coverPic;
                var cpname = typeof (cp) !== 'undefined' ? cp.name : "";
                var dpname = typeof (dp) !== 'undefined' ? dp.name : "";

            }

            console.log('cname = > ' , cpname);
            console.log('dname = > ' , dpname);
            try {
                var mailList=[];
                // console.log('old',user.contactList,'old');
                for(var i=1; i<=10; i++){
                    var kk= "mail_"+i;
                    if(req.body[kk] !== "")
                        mailList.push(req.body[kk]);
                    // console.log(kk, req.body[kk]);
                }
                // console.log(mailList);
                // console.log(req.body.mail_10);
                req.body['mail']
                var oldcp = user.coverPic;
                var olddp = user.displayPic;
                user.name = req.body.name;
                user.email = req.body.email,
                user.phone = req.body.phone;
                user.contactList=mailList;
                user.bio = req.body.bio;
                if (dpname != "") {
                    user.displayPic = dpname;
                }
                if (cpname != "") {
                    user.coverPic = cpname;
                }
                // console.log('dp cp', olddp, oldcp, dpname , cpname, 'user to be saved', user);

                await user.save()
                    .then(user => {
                        console.log(`${user} updated`);

                        fs.mkdirSync(`public/user_images/${user._id}/coverPic`
                            , { recursive: true }

                        );

                        if (cpname != "") {

                            // if (imageFile != "") {
                            if (oldcp != "") {
                                fs.unlinkSync('public/user_images/' + user._id + '/coverPic/' + oldcp
                                    // , function (err) {
                                    //     if (err)
                                    //         console.log(err);
                                    // }
                                );
                            }
                            var path = 'public/user_images/' + user._id + '/coverPic/' + cp.name;
                            cp.mv(path, function (err) {
                                return console.log(err);
                            });
                            console.log('cp moved');
                        }

                        fs.mkdirSync(`public/user_images/${user._id}/displayPic`
                            , { recursive: true }
                            // , (err) => {
                            //     if (err) {
                            //         return console.error(err);
                            //     }
                            //     console.log('dp Directory created successfully!');
                            // }
                        );
                        console.log('dp Directory created successfully!');

                        if (dpname != "") {

                            if (olddp != "") {
                                fs.unlinkSync('public/user_images/' + user._id + '/displayPic/' + olddp
                                    // , function (err) {
                                    //     if (err)
                                    //         console.log(err);
                                    // }
                                );
                            }
                            var path = 'public/user_images/' + user._id + '/displayPic/' + dp.name;
                            dp.mv(path, function (err) {
                                return console.log(err);
                            });
                            console.log('dp moved');
                        }
                        console.log('going to redirect');
                        res.redirect(`/profile`);
                    })
                    .catch(err => {
                        console.log(err);
                    });;

            }
            catch (error) {
                console.log(error);
            }
        }
        catch (error) { console.log(error); }
    }

});




app.get('/fileComplaint', async (req, res) => {
    var { isLogined = false } = req.cookies;
    // req.session.isLogined=false;
    // console.log(req.session.isLogined);
    if (isLogined !== 'true') {
        res.redirect('/');

    }
    else {
        var userId = req.cookies.userId;
        try {
            var user = await users.findById(userId).exec();

            var cssFiles = ['style.css.css', 'leftStage.css', 'centerStage.css', 'rightStage.css', 'fileComplaint.css'];
            res.render('fileComplaint.ejs', { user, cssFiles });
        }
        catch (error) { console.log(error); }
    }
});



app.get('/complaint/:cid', async (req, res) => {
    var { isLogined = false } = req.cookies;
    if (isLogined !== 'true') {
        res.redirect('/');
    }
    else {
        var userId = req.cookies.userId;
        try {
            var user = await users.findById(userId).exec();

            var cssFiles = ['style.css.css', 'leftStage.css', 'centerStage.css', 'rightStage.css', 'complaint.css'];
            var qw = req.params;
            try {
                var complaint = await complaints.findById(qw.cid).exec();
                console.log(complaint);
                res.render('complaint.ejs', { user, complaint, cssFiles });
            }
            catch (error) {
                console.log('error', error);
            }
        }
        catch (error) { console.log(error); }
    }
});




app.post('/complaint', async (req, res) => {
    var reqbody = req.body;
    console.log(reqbody.name),
        res.render('main.ejs');
});

app.post('hello', async(req,res)=>{
    console.log('hello');
})


app.post('/sendMail', async (req, res) => {
    var { isLogined = false } = req.cookies;
    if (isLogined !== 'true') {
        res.redirect('/');
    }
    else {
        var userId = req.cookies.userId;
        try {
            console.log("send mail");
            var user = await users.findById(userId).exec();
            let testAccount =  nodemailer.createTransport({
                service : 'gmail',
                auth:{
                    user :'duperhritik@gmail.com',
                    pass:'iyenozwtonxqeahw'
                }
            });
            var reciever ="";
            user.contactList.forEach(mailId =>{
                let mailOptions={
                    from:'duperhritik@gmail.com',
                    to: mailId,
                    subject :'***** CALL FOR HELP ***** ',
                    text:`your friend, ${user.name} urgently needs help. The users details are : \nNAME : ${user.name}, \nEmail : ${user.email}, \nPhone no. : ${user.phone}\n\n.Here is the location link : https:://maps.google.com/?q=${req.body.latitude},${req.body.longitude} `
                  
                }
                  testAccount.sendMail(mailOptions,function(error,info){
                   if(error){
                       console.log('error');
                   }
                   else{
                       console.log('email send ' + info.response);
                   }
                  });
            });
            console.log(user.contactList.length , user.contactList , "qwerty******",user);
          let mailOptions={
              from:'duperhritik@gmail.com',
              to: user.email,
              subject :'***** CALLED FOR HELP ***** ',
              text:` WomenSafety has send mail regarding your URGENT CALL FOR HELP to ${user.contactList.length} of your friends as per your contact list.\nYour location link : https:://maps.google.com/?q=${req.body.latitude},${req.body.longitude} `
            
          }
            testAccount.sendMail(mailOptions,function(error,info){
             if(error){
                 console.log('error');
             }
             else{
                 console.log('email send ' + info.response);
             }
            });
          
            
        }
        catch (error) { console.log(error); }
    }
});


// app.post('/sendMail',async(req,res)=>{
  

//   let testAccount =  nodemailer.createTransport({
//       service : 'gmail',
//       auth:{
//           user :'duperhritik@gmail.com',
//           pass:'iyenozwtonxqeahw'
//       }
//   });
// let mailOptions={
//     from:'duperhritik@gmail.com',
//     to:'hritikkhurana10sm@gmail.com',
//     subject :'alert for location',
//     text:`https:://google.com/maps?q=${req.body.latitude},${req.body.longitude}`
  
// }
//   testAccount.sendMail(mailOptions,function(error,info){
//    if(error){
//        console.log('error');
//    }
//    else{
//        console.log('email send ' + info.response);
//    }
//   });

// });




// filing the complaint
app.post('/posting', async (req, res) => {
    var { isLogined = false } = req.cookies;
    if (isLogined !== 'true') {
        res.redirect('/');
    }
    else {
        var userId = req.cookies.userId;
        try {
            var user = await users.findById(userId).exec();
                console.log(user);
            var pImage = req.files.files;
            if (!pImage) {
                // Handle the case when no files are uploaded
                console.log('No files uploaded');
                res.redirect('/'); // or handle differently based on your requirements
                return;
            }
            // console.log(typeof pImage);
            // console.log(pImage);

            // console.log(pImage.length);
            var accusedList = req.body.accused.split(",");
            imgNames = [];
            if (pImage.length == undefined) {
                pImage = [pImage];
            }
            pImage.forEach(function (pimage) {
                imgNames.push(pimage.name);
            });
            console.log('---------> ' , imgNames);
            console.log(req.body.description);
            var complaint = new complaints({
                authorId: user._id,
                authorName: user.name,
                authorEmail: req.body.authorEmail,
                authorPhone: req.body.authorPhoneNo,
                department: req.body.department,
                date: req.body.date,
                files: imgNames,
                accused: accusedList,
                description: req.body.description,
                status: 'pending'
            });

            // prodect.save();
            complaint.save(function (err) {
                if (err)
                    return console.log(err);
                // console.log(complaint);

                fs.mkdir(`public/complaint_images/${complaint._id}`,
                    { recursive: true }, (err) => {
                        if (err) {
                            return console.error(err);
                        }
                        console.log('Directory created successfully!');
                    });


                pImage.forEach(function (pimage) {
                    var imageFile = pimage.name;
                    if (imageFile != "") {
                        var path = 'public/complaint_images/' + complaint._id + '/' + imageFile;
                        pimage.mv(path, function (err) {
                            return console.log(err);
                        });
                    }
                });
                res.redirect('/home');

            });

        }
        catch (error) { console.log(error); }
    }
});




app.get('/logout', (req, res) => {
    res.cookie('isLogined', false);
    res.redirect('/');
});
//  - ------------------------------------------------------------------------------

// port is listening here
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
