
import db from '../config/db.js'; 
import jwt from 'jsonwebtoken';
import { verifySchoolLogin, registerSchool } from '../models/database.js';


export const loginSchool = async (req, res) => {
    const { schoolCode, accessKey } = req.body;

    if (!schoolCode || !accessKey) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    try {
        const authResult = await verifySchoolLogin(schoolCode, accessKey);

        if (!authResult.authenticated) {
            return res.status(401).json({
                success: false,
                message: "Invalid Access Code for the selected school."
            });
        }

        const token = jwt.sign(
            { code: authResult.school.school_code, role: authResult.school.role },
            process.env.JWT_SECRET || 'university_super_secret_key',
            { expiresIn: '24h' } // Increased timeline; 3s is too brief for an active session
        );

        // Fixed typo 'supperAdmin' to 'superAdmin'
        const redirectUrl = authResult.school.role === 'super_admin'
            ? `/SupperAdmin.html` 
            : `/registrar.html`;

        res.status(200).json({
            success: true,
            message: "Authentication successful.",
            token,
            role: authResult.school.role,
            redirectUrl,
            schoolName: authResult.school.school_name,
            schoolCode: authResult.school.school_code
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "A database error occurred." });
    }
};

export const createSchoolAccount = async (req, res) => {
    try {
        const { school_code, school_name, role, password } = req.body;

        if (!school_code || !school_name || !role || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        await registerSchool({
            schoolId: school_code,
            schoolName: school_name,
            role,
            accessKey: password
        });

        res.status(201).json({ success: true, message: "Account created successfully!" });
    } catch (error) {
        if (error.errno === 1062) {
            return res.status(409).json({ message: `The School ID '${req.body.school_code}' is already registered.` });
        }
        res.status(500).json({ message: "Server error occurred while creating account." });
    }
};
