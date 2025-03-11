import os
import logging
import ssl
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from pydantic import BaseModel
from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
import uvicorn

# Ensure SSL module is available
ssl._create_default_https_context = ssl._create_unverified_context

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "https://your-frontend-url.onrender.com")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client with proper error handling
try:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError("Supabase credentials not properly configured")
    
    supabase_client: Client = create_client(
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        options=ClientOptions(
            auto_refresh_token=True,
            persist_session=True
        )
    )
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    raise

# Create a Flow instance for Google OAuth
flow = Flow.from_client_config(
    {
        "web": {
            "client_id": os.getenv("CLIENT_ID"),
            "client_secret": os.getenv("CLIENT_SECRET"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [os.getenv("BACKEND_URL", "https://your-backend-url.onrender.com") + "/callback"]
        }
    },
    scopes=["https://www.googleapis.com/auth/calendar"]
)

class MeetingData(BaseModel):
    attendeeEmails: str
    subject: str
    description: str
    duration: str
    date: str
    time: str

@app.get("/")
async def root():
    return {"status": "API is running"}

@app.get("/auth/status")
async def auth_status():
    try:
        result = supabase_client.table('private.google_oauth_user_wise').select("*").limit(1).execute()
        return {"isAuthenticated": len(result.data) > 0}
    except Exception as e:
        logger.error(f"Error checking auth status: {str(e)}")
        return {"isAuthenticated": False}

@app.get("/login")
async def login():
    try:
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            prompt='consent'
        )
        logger.debug(f"Authorization URL: {authorization_url}")
        return RedirectResponse(authorization_url)
    except Exception as e:
        logger.error(f"Error in /login: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/callback")
async def callback(code: str):
    try:
        logger.debug(f"Received code: {code}")
        flow.fetch_token(code=code)
        
        if not flow.credentials:
            logger.error("Failed to fetch credentials")
            raise HTTPException(status_code=400, detail="Failed to fetch credentials")

        credentials = flow.credentials
        
        user_id = "de3208ff-d59b-405e-ad9a-76fc6bee30d2"
        supabase_client.table('private.google_oauth_user_wise').upsert({
            "user_id": user_id,
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "expires_at": credentials.expiry.isoformat()
        }).execute()

        return RedirectResponse(os.getenv("FRONTEND_URL", "https://your-frontend-url.onrender.com"))
    except Exception as e:
        logger.error(f"Error in /callback: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/meetings/create")
async def create_meeting(meeting_data: MeetingData):
    try:
        result = supabase_client.table('private.google_oauth_user_wise').select("*").limit(1).execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="No credentials found")
        
        creds_data = result.data[0]
        credentials = Credentials(
            token=creds_data['access_token'],
            refresh_token=creds_data['refresh_token'],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv('CLIENT_ID'),
            client_secret=os.getenv('CLIENT_SECRET'),
        )

        service = build('calendar', 'v3', credentials=credentials)
        
        start_time = datetime.strptime(f"{meeting_data.date} {meeting_data.time}", "%Y-%m-%d %H:%M")
        end_time = start_time + timedelta(minutes=int(meeting_data.duration))

        event = {
            'summary': meeting_data.subject,
            'description': meeting_data.description,
            'start': {'dateTime': start_time.isoformat(), 'timeZone': 'UTC'},
            'end': {'dateTime': end_time.isoformat(), 'timeZone': 'UTC'},
            'attendees': [{'email': email.strip()} for email in meeting_data.attendeeEmails.split(',')],
            'reminders': {'useDefault': True},
            'conferenceData': {
                'createRequest': {
                    'requestId': f"meeting_{datetime.now().timestamp()}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'}
                }
            }
        }

        event = service.events().insert(
            calendarId='primary',
            body=event,
            conferenceDataVersion=1,
            sendUpdates='all'
        ).execute()

        return {"message": "Meeting created successfully", "meetingLink": event.get('hangoutLink', ''), "eventId": event['id']}
    except Exception as e:
        logger.error(f"Error creating meeting: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 10000)))
