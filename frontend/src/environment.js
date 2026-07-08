let IS_PROD = window.location.hostname !== "localhost";
const server = IS_PROD ?
    "https://apnacollegebackend.onrender.com" :
    "http://localhost:8000";

export default server;