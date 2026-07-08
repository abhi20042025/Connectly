import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import httpStatus from "http-status";
import server from "../environment";

// 1. Explicitly create the context object
export const AuthContext = createContext(null);

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);
    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            let request = await client.post("/register", {
                name,
                username,
                password
            });
            if (request.status === httpStatus.CREATED || request.status === 201) {
                return request.data.message;
            }
        } catch (err) {
            console.error("Registration error:", err);
            throw err;
        }
    };

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username,
                password
            });
            if (request.status === httpStatus.OK || request.status === 200) {
                localStorage.setItem("token", request.data.token);
                setUserData(request.data.user || { username });
                router("/home");
            }
        } catch (err) {
            console.error("Login error:", err);
            throw err;
        }
    };

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: { token: localStorage.getItem("token") }
            });
            return request.data;
        } catch (err) {
            throw err;
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request.data;
        } catch (e) {
            throw e;
        }
    };

    const data = {
        userData,
        setUserData,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};