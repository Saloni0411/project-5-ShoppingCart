const userModel = require("../model/userModel")
const productModel = require("../model/productModel")
const cartModel = require("../model/cartModel")
const validator = require("../validator/validation")

/*********************************** Create Cart ************************************/

let createCart = async function (req, res) {
    try {
      const userId = req.params.userId;
      const idFromToken = req.userId
  
      if (!validator.isValidObjectId(userId)) {
        return res.status(400).send({ status: false, message: "Enter a valid userId" });
      }
  
      const user = await userModel.findOne({ _id: userId });
      if (!user) {
        return res.status(404).send({ status: false, message: "User not found" });
      }
  
      if (userId != idFromToken) {
        return res.status(403).send({ status: false, message: "User not authorized" })
      }
  
      const requestBody = req.body;

      if (Object.keys(requestBody) == 0) { return res.status(400).send({status:false,message:"No data provided"})}
  
      const { cartId, productId } = requestBody;
  
      if (!validator.isValid(productId)) {
        return res.status(400).send({ status: false, message: "enter the productId" });
      }
  
      if (!validator.isValidObjectId(productId)) {
        return res.status(400).send({ status: false, message: "enter a valid productId" });
      }
  
      const product = await productModel.findOne({ _id: productId, isDeleted: false });
  
      if (!product) {
        return res.status(404).send({ status: false, message: "product not found" });
      }
  
      if (!cartId) {
        const cartAlreadyPresent = await cartModel.findOne({ userId: userId });
        if (cartAlreadyPresent) {
          return res.status(404).send({ status: false, message: "cart already exist" });
        }
        newCart = {
          userId: userId,
          items: [{
            productId: productId,
            quantity: 1
          }],
          totalPrice: product.price,
          totalItems: 1,
        };
  
        newCart = await cartModel.create(newCart);
  
        return res.status(201).send({ status: true, message: "Success", data: newCart });
      }
      
      if (cartId) {
        if (!validator.isValidObjectId(cartId)) {
          return res.status(400).send({ status: false, message: "enter a valid cartId" });
        }
  
        const cartAlreadyPresent = await cartModel.findOne({ _id: cartId, userId: userId });
        if (!cartAlreadyPresent) {
          return res.status(400).send({ status: false, message: "Cart does not exist" });
        }
        
        let totalPrice = product.price
        if (cartAlreadyPresent) {
  
          totalPrice += cartAlreadyPresent.totalPrice;
  
          let itemsArr = cartAlreadyPresent.items
          for (i in itemsArr) {
            if (itemsArr[i].productId.toString() === productId) {
              itemsArr[i].quantity += 1
  
              let updatedCart = { items: itemsArr, totalPrice: totalPrice, totalItems: itemsArr.length }
  
              let responseData = await cartModel.findOneAndUpdate({ userId: userId }, updatedCart, { new: true })
  
              return res.status(201).send({ status: true, message: `Success`, data: responseData })
            }
          }
          itemsArr.push({ productId: productId, quantity: 1 })
  
          let updatedCart = { items: itemsArr, totalPrice: totalPrice, totalItems: itemsArr.length }
          let responseData = await cartModel.findOneAndUpdate({ userId: userId }, updatedCart, { new: true })
  
          return res.status(201).send({ status: true, message: 'Success', data: responseData })
        }
      }
    }

    catch (error) {
      return res.status(500).send({ status: false, message: error.message })
    }
  }

const updateCart = async function(req,res) {
    try{
        const body = req.body
        const userId = req.params.userId;

        if(Object.keys(body) == 0){
            return res.status(400).send({ status: false, msg: "Please provide data to update."});
        }

        if(!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, msg: "Invalid parameters"});
        }

        const userSearch = await userModel.findById({_id:userId})
        if(!userSearch) {
            return res.status(400).send({status: false, msg: "userId does not exist"})
        }

        if(userId !== req.userId) {
            return res.status(401).send({status: false, msg: "Unauthorised access"})
        }

        const {cartId, productId, removeProduct} = body

        if(!validator.isValid(cartId)) {
            return res.status(400).send({status: false, msg: "CartId is required"})
        }

        if(!validator.isValidObjectId(cartId)) {
            return res.status(400).send({status: false, msg: "Invalid cartId"})
        }

        if(!validator.isValid(productId)) {
            return res.status(400).send({status: false, msg: "productId is required"})
        }

        if(!validator.isValidObjectId(productId)) {
            return res.status(400).send({status: false, msg: "Invalid productId"})
        }

        const cartSearch = await cartModel.findOne({_id: cartId})
        if(!cartSearch) {
            return res.status(404).send({status: false, msg: "Cart does not exist"})
        }

        const productSearch = await productModel.findOne({ _id: productId})
        if(!productSearch) {
            return res.status(404).send({status: false, msg: "product does not exist"})
        }

        if(productSearch.isDeleted == true) {
            return res.status(400).send({status: false, msg: "Product is already deleted"})
        }

        if((removeProduct != 0) && (removeProduct != 1)) {
            return res.status(400).send({status: false, msg: "Invalid remove product"})
        }


        const cart = cartSearch.items
        for(let i=0; i<cart.length; i++) {
            if(cart[i].productId == productId) {
                const priceChange = cart[i].quantity * productSearch.price
                if(removeProduct == 0) {
                    const productRemove = await cartModel.findOneAndUpdate({_id: cartId}, {$pull: {items:{productId: productId}}, totalPrice: cartSearch.totalPrice-priceChange, totalItems:cartSearch.totalItems-1}, {new:true})
                    return res.status(200).send({status: true, message: 'Success', data: productRemove})
                }

                if(removeProduct == 1) {
                    if(cart[i].quantity == 1 && removeProduct == 1) {
                     const priceUpdate = await cartModel.findOneAndUpdate({_id: cartId}, {$pull: {items: {productId: productId}}, totalPrice:cartSearch.totalPrice-priceChange, totalItems:cartSearch.totalItems-1}, {new: true})
                     return res.status(200).send({status: true, message: 'Success', data: priceUpdate})
                }

                cart[i].quantity = cart[i].quantity - 1
                const updatedCart = await cartModel.findByIdAndUpdate({_id: cartId}, {items: cart, totalPrice:cartSearch.totalPrice - productSearch.price}, {new: true})
                return res.status(200).send({status: true, message: 'Success', data: updatedCart})
                }
            }
           return res.status(400).send({ status: false, message: "Product does not found in the cart"})
        }
        
    }
    catch (error) {
        console.log("This is the error :", error.message)
        res.status(500).send({ msg: "Error", error: error.message })
    } 
}


const getCart = async (req,res) => {
    try{
        // Validate params
        userId = req.params.userId
        if(!validator.isValidObjectId(userId)) {
            return res.status(400).send({status: false, message: `${userId} is invalid`})
        }

        // AUTHORISATION
           if(userId !== req.userId) {
            return res.status(401).send({status: false, message: "Unauthorised access"})
        } 

        // to check user present or not
        const userSearch = await userModel.findById({_id:userId})
        if(!userSearch) {
            return res.status(400).send({status: false, message: "userId does not exist"})
        }


        // To check cart is present or not
        const cartSearch = await cartModel.findOne({userId:userId})
        if(!cartSearch) {
            return res.status(400).send({status: true, message: "UserId does not exist"})
        }
        return res.status(200).send({status: true, message: "Success", data: cartSearch})

    }
    catch (error) {
        console.log("This is the error :", err.message)
        res.status(500).send({ message: "Error", error: error.message })
    }
}

const deleteCart = async function(req,res) {
    try{
         // Validate params
         userId = req.params.userId
         if(!validator.isValidObjectId(userId)) {
            return res.status(400).send({status: false, message: `${userId} is invalid`})
         }
          // AUTHORISATION
        if(userId !== req.userId) {
            return res.status(401).send({status: false, message: "Unauthorised access"})
        }
        //  To check user is present or not
        const userSearch = await userModel.findById({ _id: userId})
        if(!userSearch) {
            return res.status(404).send({status: false, message: "User doesnot exist"})
        }
       
        // To check cart is present or not
        const cartSearch = await cartModel.findOne({userId:userId})
        if(!cartSearch) {
            return res.status(404).send({status:false, message: "cart doesnot exist"})
        }

        const cartdelete = await cartModel.findOneAndUpdate({userId}, {items:[], totalItems:0, totalPrice:0}, {new: true})
        res.status(200).send({status: true, message:"Cart deleted"})

    }
    catch (error) {
        console.log("This is the error :", error.message)
        res.status(500).send({status:false, message: "Error", error: error.message })
    }
}

module.exports = { createCart,updateCart,getCart, deleteCart}