from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from openai import OpenAI
from dotenv import load_dotenv

from database import SessionLocal, engine
import models

models.Base.metadata.create_all(bind=engine)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

@app.get("/chat")
def chat(user_input: str, chat_id: str = "default"):
    db = SessionLocal()

    try:
        history = db.query(models.Chat).filter(
            models.Chat.chat_id == chat_id
        ).all()

        messages = [
            {"role": "system", "content": "You are a smart assistant."}
        ]

        for chat in history[-5:]:
            messages.append({"role": "user", "content": chat.user_input})
            messages.append({"role": "assistant", "content": chat.ai_response})

        messages.append({"role": "user", "content": user_input})

        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=messages
        )

        reply = response.choices[0].message.content

        # TITLE GENERATION (only first message)
        if len(history) == 0:
            title = user_input[:25]
        else:
            title = history[0].title

        chat_entry = models.Chat(
            chat_id=chat_id,
            title=title,
            user_input=user_input,
            ai_response=reply
        )

        db.add(chat_entry)
        db.commit()

        return {"reply": reply}

    except Exception as e:
        return {"error": str(e)}

    finally:
        db.close()


@app.get("/history")
def history(chat_id: str):
    db = SessionLocal()

    chats = db.query(models.Chat).filter(
        models.Chat.chat_id == chat_id
    ).all()

    return [
        {"user": c.user_input, "ai": c.ai_response}
        for c in chats
    ]


@app.get("/chats")
def get_chats():
    db = SessionLocal()

    chats = db.query(models.Chat).all()

    unique = {}

    for c in chats:
        unique[c.chat_id] = c.title

    return [
        {"chat_id": cid, "title": title}
        for cid, title in unique.items()
    ]