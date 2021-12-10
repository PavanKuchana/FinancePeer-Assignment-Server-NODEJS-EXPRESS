const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const databasePath = path.join(__dirname, "userData.db");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(process.env.PORT || 6000, () =>
      console.log("Server Running at http://localhost:6000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const checkToken = (req, res, nxt) => {
  let jwtToken;
  const authHeader = req.headers.authorization;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKENN", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        nxt();
      }
    });
  }
};

const validatePassword = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      let jwtToken = jwt.sign(payload, "MY_SECRET_TOKENN");
      response.send({ jwtToken });
      response.status(200);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.post("/users/", checkToken, async (request, response) => {
  const userDetails = request.body;
  const values = userDetails.map(
    (each) => `('${each.userId}', '${each.id}', '${each.title}','${each.body}')`
  );

  const valuesString = values.join(",");

  const addUserQuery = `
    INSERT INTO
      userData (user_id,id,title,body)
    VALUES
       ${valuesString};`;

  const dbResponse = await db.run(addUserQuery);
  const ItemId = dbResponse.lastID;
  response.send({ ItemId: ItemId });
});

app.get("/users/", checkToken, async (req, res) => {
  const getFromDatabase = await database.all(`
    SELECT * FROM userData
    `);
  res.send({ getFromDatabase });
});

module.exports = app;
