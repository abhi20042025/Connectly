import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../../data/users.json');
const MEETINGS_FILE = path.join(__dirname, '../../data/meetings.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const readData = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error reading JSON db:", err);
        return [];
    }
};

const writeData = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error("Error writing JSON db:", err);
    }
};

export const dbService = {
    isMongoConnected: () => mongoose.connection.readyState === 1,

    user: {
        findOne: async (query) => {
            if (dbService.isMongoConnected()) {
                const { User } = await import('./user.model.js');
                return await User.findOne(query);
            }
            
            console.log("MongoDB is disconnected. Falling back to local JSON database query:", query);
            const users = readData(USERS_FILE);
            const user = users.find(u => {
                return Object.entries(query).every(([key, val]) => u[key] === val);
            });
            
            if (!user) return null;
            
            // Return proxy object with save() method to mimic Mongoose document API
            return {
                ...user,
                save: async function() {
                    const allUsers = readData(USERS_FILE);
                    const idx = allUsers.findIndex(u => u.username === this.username);
                    if (idx !== -1) {
                        allUsers[idx] = {
                            name: this.name,
                            username: this.username,
                            password: this.password,
                            token: this.token
                        };
                        writeData(USERS_FILE, allUsers);
                    }
                    return this;
                }
            };
        },
        create: async (userData) => {
            if (dbService.isMongoConnected()) {
                const { User } = await import('./user.model.js');
                const newUser = new User(userData);
                return await newUser.save();
            }
            
            console.log("MongoDB is disconnected. Saving user to local JSON database:", userData.username);
            const users = readData(USERS_FILE);
            const newUser = {
                name: userData.name,
                username: userData.username,
                password: userData.password,
                token: userData.token || ""
            };
            users.push(newUser);
            writeData(USERS_FILE, users);
            return newUser;
        }
    },
    meeting: {
        find: async (query) => {
            if (dbService.isMongoConnected()) {
                const { Meeting } = await import('./meeting.model.js');
                return await Meeting.find(query);
            }
            
            console.log("MongoDB is disconnected. Fetching meeting history from local JSON database:", query);
            const meetings = readData(MEETINGS_FILE);
            return meetings.filter(m => {
                return m.user_id === query.user_id;
            });
        },
        create: async (meetingData) => {
            if (dbService.isMongoConnected()) {
                const { Meeting } = await import('./meeting.model.js');
                const newMeeting = new Meeting(meetingData);
                return await newMeeting.save();
            }
            
            console.log("MongoDB is disconnected. Storing meeting log to local JSON database:", meetingData.meetingCode);
            const meetings = readData(MEETINGS_FILE);
            const newMeeting = {
                user_id: meetingData.user_id,
                meetingCode: meetingData.meetingCode,
                date: meetingData.date || new Date().toISOString()
            };
            meetings.push(newMeeting);
            writeData(MEETINGS_FILE, meetings);
            return newMeeting;
        }
    }
};
