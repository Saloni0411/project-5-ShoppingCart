const userModel = require("../model/userModel")
const validator = require("../validator/validation")
const jwt = require("jsonwebtoken");
const aws = require("../aws/aws")
const bcrypt = require("bcrypt");

/************************************************* creting user ************************************************ */

let createUser = async (req,res) =>{
    try {
        // extract data and file from RequestBody
        const data = JSON.parse(JSON.stringify(req.body))

        console.log(data)
        const files = req.files

        // checking if user does not enters any data
        if (Object.keys(data) == 0) { return res.status(400).send({status:false,message:"No data provided"})}

        // checking files are coming or not
        if ( files && files.length > 0){
            let uploadFileUrl = await aws.uploadFile(files[0])
            data.profileImage = uploadFileUrl            
        }
        else{
           return res.status(400).send({ status: false, message: "profileImage is required"})
        }  


        // checking for fname 
        if (!(validator.isValid(data.fname))) { return res.status(400).send({status:false, message:"please enter first name"}) }

        // checking for lname 
        if (!(validator.isValid(data.lname))) { return res.status(400).send({status:false, message:"please enter last name"}) }

        // checking for email
        if (!(validator.isValid(data.email))) { return res.status(400).send({status:false, message:"please enter email"}) }
        if (!(validator.isEmailValid(data.email))) { return res.status(400).send({status:false, message:"please enter valid Email"}) }

        const duplicateEmail = await userModel.findOne({email : data.email});
        if(duplicateEmail) {return res.status(400).send({status:false, message:"Email is already exist"})};

        // checking for phone
        if (!(validator.isValid(data.phone))) { return res.status(400).send({status:false, message:"please enter phone no."}) }

        if (!(validator.isPhoneValid(data.phone))) { return res.status(400).send({status:false, message:"please enter valid phone"}) }

        const duplicatePhone = await userModel.findOne({phone:data.phone});
        if(duplicatePhone) {return res.status(400).send({status:false, message:"phone is already exist"})};

        // checking for password
        if (!data.password) return res.status(400).send({ status: false, message: "please enter password"})

        if (!validator.validPassword(data.password)) {
          return res.status(400).send({ status: false, message:  'Password should be of minimum 8 characters & maximum 15 characters' })
      }
        // using bcrypt
        const rounds = 10;
         let hash = await bcrypt.hash(data.password, rounds);
         data.password = hash;


        // checking for address
        let address = JSON.parse(data.address)

        console.log(address, "check")
        
        
        if(!validator.isValid(address)) { return res.status(400).send({ status: false, message: " address is required" }) }

        console.log(validator.isValid(address.shipping))
        if(!validator.isValid(address.shipping)) { return res.status(400).send({ status: false, message: " address shipping is required" }) }
        // for shipping address
        console.log(validator.isValid(address.shipping.street))
        if (!(validator.isValid(address.shipping.street))) { return res.status(400).send({ status: false, message: " Street address is required" }) }

        
        if (!(validator.isValid(address.shipping.city))) { return res.status(400).send({ status: false, message: " city address is required" }) }

        if (!(validator.isValid(address.shipping.pincode))) { return res.status(400).send({ status: false, message: " pincode address is required" }) }


        // for billing address
        if (!(validator.isValid(address.billing.street))) { return res.status(400).send({ status: false, message: " Street address is required" }) }

        if (!(validator.isValid(address.billing.city))) { return res.status(400).send({ status: false, message: " city address is required" }) }

         if (!(validator.isValid(address.billing.pincode))) { return res.status(400).send({ status: false, message: " pincode address is required" }) } 
         
         data.address = address


        let result = await userModel.create(data)
          res.status(201).send({status:true, message:"User created successfully", data:result})
        }
    catch(error){
        res.status(500).send({status:false, message:error.message})
    }
}


/****************************************** Login User **************************************************/
const loginUser = async function (req, res) {
  try{
    let data = req.body

  // checking if user does not enters any data
  if (Object.keys(data) == 0) { return res.status(400).send({status:false,message:"Please provide email and password"})}

  // checking for email
  if (!(validator.isValid(data.email))) { return res.status(400).send({status:false, message:"please enter email"}) }
  if (!(validator.isEmailValid(data.email))) { return res.status(400).send({status:false, message:"please enter valid Email"}) }

   // checking for password
   if (!data.password) return res.status(400).send({ status: false, message: "please enter password"})
   if(!validator.validPassword(data.password)) {return res.status(400).send({ status: false, message: 'Password should be of minimum 8 characters & maximum 15 characters' })}

   let findUser = await userModel.findOne({email: data.email})

   if (!findUser)  return res.status(404).send({ status: false, message: "email is not correct"})

   let isValidPassword = await bcrypt.compare(data.password, findUser.password)

   if(!isValidPassword) return res.status(404).send({ status: false, message: "password is not correct"});

   let currTime = Math.floor(Date.now()/1000)
     let token = jwt.sign(
       {
        userId: findUser._id.toString(),
        iat: currTime,
        exp: currTime + 36000
      }, "functionUp" )
    res.header('Authorization', token)
    return res.status(201).send({ status: true, message: 'Success', data:{userId: `${findUser._id}`, token: token} });
  }

  catch(error){
    res.status(500).send({status:false, message:error.message})
  }
}

/****************************************** User Details **************************************************/
const getDetails = async function (req, res) {
  try {
      let userId = req.params.userId;
      if(!validator.isValidObjectId(userId)){
        return res.status(400).send({ status: false, message: "Inavlid userId." })
      }
          let findData = await userModel.findById(userId);
          if (!findData) {
              return res.status(404).send({ status: false, message: "No user Found" });
          }  
          if (userId != req.userId) {  
            return res.status(403).send({ status: false, message: "not Authorize" });
          } 
            return res.status(200).send({ status: true, message: "User Profile Details...", data: findData })

  } catch (err) {
      console.log(err);
      res.status(500).send({ status: false, message: err });
  }
}

/****************************update user details************************************************* */
const updateUser = async function(req, res) {

  const data = req.body;
  const files = req.files
  
  const userIdFromParams = req.params.userId
  const userIdFromToken = req.userId

  const { fname, lname, email, phone, password } = data

  const updatedData = {}

  if (!validator.isValidObjectId(userIdFromParams)) { 
    return res.status(400).send({ status: false, message: "Valid userId is required" })
   }

   const userByuserId = await userModel.findById(userIdFromParams);

        if (!userByuserId) {
            return res.status(404).send({ status: false, message: 'user not found.' });
        }
        if (userIdFromToken != userIdFromParams) {
            return res.status(403).send({status: false,message: "Unauthorized access."});
        }
        if (Object.keys(data) == 0) {
            return res.status(400).send({status: false,message: "please provide data to update"})
        }
  //=======================================fname validation=====================================
  if (fname) {
      if (!(validator.isValid(fname))) {
          return res.status(400).send({ status: false, Message: "First name is required" })
      }
      updatedData.fname = fname
  }
  //===================================lname validation==========================================
  if (lname) {
      if (!(validator.isValid(lname))) {
          return res.status(400).send({ status: false, Message: "Last name is required" })
      }
      updatedData.lname = lname
  }
  //================================email validation==============================================
  if (email) {
        
        if (!(validator.isValid(email))) { return res.status(400).send({status:false, message:"please enter email"}) }
        if (!(validator.isEmailValid(email))) { return res.status(400).send({status:false, message:"please enter valid Email"}) }
      }
      const isEmailUsed = await userModel.findOne({ email: email })
      if (isEmailUsed) {
          return res.status(400).send({ status: false, message: "email is alredy exist" })
      }
      updatedData.email = email
  
  //=======================profile pic upload and validation==========================

  
  if ( files && files.length > 0){
      let uploadFileUrl = await aws.uploadFile(files[0])
      updatedData.profileImage = uploadFileUrl
}
  //===============================phone validation-========================================

  if (phone) {
      if (!(validator.isValid(phone))) { return res.status(400).send({status:false, message:"please enter phone no."}) }

      if (!(validator.isPhoneValid(phone))) { return res.status(400).send({status:false, message:"please enter valid phone"}) }
      updatedData.phone = phone

      const duplicatePhone = await userModel.findOne({phone:phone});
        if(duplicatePhone) {return res.status(400).send({status:false, message:"phone is already exist"})};
  }
  //======================================password validation-====================================
  if (password) {
      if (!password) return res.status(400).send({ status: false, message: "please enter password"})

      if(password.trim().length<8 || password.trim().length>15) {return res.status(400).send({ status: false, message: 'Password should be of minimum 8 characters & maximum 15 characters' })}

    // using bcrypt
    const rounds = 10;
     let hash = await bcrypt.hash(password, rounds);
     
      updatedData.password = hash
  }
  
  //========================================address validation=================================
 if(data.address){
  const address = JSON.parse(data.address)
    data.address = address
 
    if (!(validator.isValid(address.shipping.street)))
         { return res.status(400).send({ status: true, message: " Street address is required" }) }

          updatedData["address.shipping.street"] = address.shipping.street

          if (!(validator.isValid(address.shipping.city))) 
          { return res.status(400).send({ status: true, message: " city address is required" }) }

          updatedData["address.shipping.city"] = address.shipping.city
          
          if (!(validator.isValid(address.shipping.pincode))) { return res.status(400).send({ status: false, message: " pincode address is required" }) }

         /*if (!(validator.isValid(address.shipping.pincode))) { return res.status(400).send({status:false, message:"Please provide pincode in 6 digit number"})} */
          updatedData["address.shipping.pincode"] = address.shipping.pincode
      

      
          if (!(validator.isValid(address.billing.street)))
        { return res.status(400).send({ status: true, message: " Street address is required" }) }

          updatedData["address.billing.street"] = address.billing.street

          if (!(validator.isValid(address.billing.city))) 
          { return res.status(400).send({ status: true, message: " city address is required" }) }

          updatedData["address.billing.city"] = address.billing.city

          if ((!validator.isValid(address.billing.pincode))) { return res.status(400).send({ status: false, message: " pincode address is required" }) }

        /* if (!(validator.isValidPincode(address.billing.pincode))) { return res.status(400).send({status:false, message:"Please provide pincode in 6 digit number"})} */
          updatedData["address.billing.pincode"] = address.billing.pincode
}    
 //=========================================update data=============================

  const updatedUser = await userModel.findOneAndUpdate({ _id: userIdFromParams }, updatedData, { new: true })

  return res.status(200).send({ status: true, message: "User profile updated", data: updatedUser });

}


module.exports = {createUser, loginUser, getDetails,updateUser}

