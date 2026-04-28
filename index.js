import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg'; 
const { Client } = pkg;
import multer from 'multer'; 
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


const client = new Client({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL');
        
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await client.query(createTableQuery);
        console.log("Database table is ready.");
    } catch (err) {
        console.error("DB Error:", err.message);
    }
}
initDB();


const uploadDir = 'public/uploads/';
await fs.mkdir(uploadDir, { recursive: true });

// 3. Конфігурація сховища
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });


app.use(express.json());
app.use(express.static('public'));


app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('Файл не обрано');

        const { filename, path: filepath } = req.file;

        // Записуємо дані в БД
        const insertQuery = 'INSERT INTO images (filename, filepath) VALUES ($1, $2) RETURNING *';
        const result = await client.query(insertQuery, [filename, filepath]);

        res.status(201).json({
            message: "Файл успішно збережено",
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Помилка сервера');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
