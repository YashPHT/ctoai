const User = require('../models/User');
const { signAuthToken } = require('../utils/token');

const authController = {
  register: async (req, res) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide username, email, and password'
        });
      }

      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with that email or username'
        });
      }

      const user = await User.create({
        username,
        email,
        password,
        firstName,
        lastName,
        authProvider: 'local'
      });

      const token = signAuthToken({ id: user._id });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          authProvider: user.authProvider,
          profilePicture: user.profilePicture,
          token
        }
      });
    } catch (error) {
      console.error('[AuthController] Error during registration:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.message,
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error registering user',
        error: error.message
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide email and password'
        });
      }

      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: 'This account is linked to Google. Please sign in with Google.'
        });
      }

      const isPasswordMatch = await user.matchPassword(password);

      if (!isPasswordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const token = signAuthToken({ id: user._id });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          _id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          authProvider: user.authProvider,
          profilePicture: user.profilePicture,
          token
        }
      });
    } catch (error) {
      console.error('[AuthController] Error during login:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging in',
        error: error.message
      });
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-password');

      res.json({
        success: true,
        message: 'User profile retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('[AuthController] Error getting user profile:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving user profile',
        error: error.message
      });
    }
  }
};

module.exports = authController;
