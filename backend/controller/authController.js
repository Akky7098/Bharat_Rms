const authService = require("../services/authService");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await authService.loginUser(email, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }
};

module.exports = {
  login,
};

const googleLogin = async (req, res) => {
  try {
    const data = await authService.loginWithGoogle(req.body?.credential);
    return res.status(200).json({ success: true, message: "Login successful", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code || "GOOGLE_LOGIN_ERROR", message: error.statusCode ? error.message : "Unable to sign in with Google. Please try again." });
  }
};
const linkGoogle = async (req, res) => {
  try {
    const data = await authService.linkGoogleAccount(req.user._id, req.body?.credential);
    return res.status(200).json({ success: true, message: "Google account linked", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, code: error.code || "GOOGLE_LINK_ERROR", message: error.statusCode ? error.message : "Unable to link Google account." });
  }
};
module.exports.googleLogin = googleLogin;
module.exports.linkGoogle = linkGoogle;
