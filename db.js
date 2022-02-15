const Sequelize = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.byToken = async (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT);
    const user = await User.findByPk(payload.userId);

    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
      // password,
    },
  });

  const hashedPW = user.password;

  // returns true/false
  const verifyGood = await bcrypt.compare(password, hashedPW);

  // our code
  if (verifyGood) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT);
    return token;
  } else {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.beforeCreate(async (user) => {
  let hashedPW = await bcrypt.hash(user.password, 4);
  user.password = hashedPW;
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const notes = [
    { text: "dear diary" },
    { text: "the weather is nice" },
    { text: "I bought a coffee today" },
  ];

  const [dear, weather, coffee] = await Promise.all(
    notes.map((note) => Note.create(note))
  );

  await lucy.addNote(weather);
  await moe.addNote(coffee);
  await larry.addNote(dear);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

User.hasMany(Note);
Note.belongsTo(User);

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
