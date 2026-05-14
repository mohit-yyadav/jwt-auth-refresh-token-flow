const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) =>{

    return jwt.sign(
        {
            id:user._id,
            email:user.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:'1m',
        }
    );
};


const generateRefreshToken = (user) =>{

    return jwt.sign(
        {
            id:user._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:'7d',
        }
    );
};


exports.register = async (req,res) => {
    try {
        const {name , email, password} = req.body;

        const existingUser = await User.findOne({email});

        if(existingUser){
            return res.status(400).json({message:'User already exists'});
        }

        const hashedPassword = await bcrypt.hash(password,10);

        const user = new User({
            name,
            email,
            password:hashedPassword,
        });

        res.status(201).json({
            success:true,
            message:'User registered successfully',
            user,});
    } catch (error) {
        res.status(500).json({message:'Internal server error'});
    }
};


exports.login = async (req,res) => {
    try {
        const {email, password} = req.body;

        const user = await User.findOne({email});

        if(!user){
            return res.status(400).json({message:'Invalid credentials'});
        }

        const isMatch = await bcrypt.compare(password,user.password);
        
        if(!isMatch){
            return res.status(400).json({message:'Invalid credentials'});
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            success:true,
            message:'Login successful',
            accessToken,
            refreshToken,
        });
    } catch (error) {
        res.status(500).json({message:'Internal server error'});
    }
}


exports.refreshToken = async (req,res) => {
    try {
        const {refreshToken} = req.body;

        if(!refreshToken){
            return res.status(400).json({message:'Refresh token is required'});
        }

        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            async (err, decoded) => {
                if(err){
                    return res.status(403).json({message:'Invalid refresh token'});
                }

                const user = await User.findById(decoded.id);

                if(!user || user.refreshToken !== refreshToken){
                    return res.status(403).json({message:'Invalid refresh token'});
                }

                const newAccessToken = generateAccessToken(user);

                res.status(200).json({
                    success:true,
                    accessToken:newAccessToken,
                });
            }
        );
    }
        catch (error) {
        res.status(500).json({message:'Internal server error'});
    }
}


