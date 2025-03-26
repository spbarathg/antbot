from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import os
import sqlite3
from contextlib import contextmanager
from typing import Optional

# Load environment variables
load_dotenv()

app = FastAPI(title="AntBot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database
def init_db():
    with sqlite3.connect('antbot.db') as conn:
        conn.execute('''
        CREATE TABLE IF NOT EXISTS bot_status (
            id INTEGER PRIMARY KEY,
            is_active BOOLEAN,
            total_balance REAL,
            active_trades INTEGER,
            success_rate REAL
        )
        ''')
        
        # Insert default status if not exists
        conn.execute('''
        INSERT OR IGNORE INTO bot_status (id, is_active, total_balance, active_trades, success_rate)
        VALUES (1, 1, 12345.67, 5, 87.5)
        ''')
        conn.commit()

@contextmanager
def get_db():
    conn = sqlite3.connect('antbot.db')
    try:
        yield conn
    finally:
        conn.close()

# Initialize database on startup
init_db()

@app.get("/")
async def root():
    return {"status": "ok", "message": "AntBot API is running"}

@app.get("/status")
async def get_status():
    with get_db() as conn:
        result = conn.execute('SELECT * FROM bot_status WHERE id = 1').fetchone()
        return {
            "bot_status": "active" if result[1] else "inactive",
            "total_balance": result[2],
            "active_trades": result[3],
            "success_rate": result[4]
        }

@app.post("/status/update")
async def update_status(is_active: Optional[bool] = None, total_balance: Optional[float] = None):
    with get_db() as conn:
        updates = []
        values = []
        if is_active is not None:
            updates.append("is_active = ?")
            values.append(is_active)
        if total_balance is not None:
            updates.append("total_balance = ?")
            values.append(total_balance)
            
        if updates:
            query = f"UPDATE bot_status SET {', '.join(updates)} WHERE id = 1"
            conn.execute(query, values)
            conn.commit()
            
    return await get_status()

if __name__ == "__main__":
    host = os.getenv("API_HOST", "localhost")
    port = int(os.getenv("API_PORT", 8080))
    uvicorn.run(app, host=host, port=port) 