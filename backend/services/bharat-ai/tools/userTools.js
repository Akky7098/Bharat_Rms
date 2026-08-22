const { User } = require("../modelRegistry");
const { isManagement } = require("../security/aiAccess");

const searchUsers = async ({
  requestingUser,
  search = "",
  limit = 10,
}) => {
  const query = {};

  if (!isManagement(requestingUser)) {
    query._id = requestingUser._id;
  } else if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .select("_id name email role attendanceMode")
    .sort({ name: 1 })
    .limit(Math.min(Math.max(Number(limit) || 10, 1), 25))
    .lean();

  return {
    count: users.length,
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      attendanceMode: u.attendanceMode,
    })),
  };
};

const getMyProfile = async ({ requestingUser }) => {
  const user = await User.findById(requestingUser._id)
    .select("_id name email role attendanceMode")
    .lean();

  return { user };
};

module.exports = {
  searchUsers,
  getMyProfile,
};
