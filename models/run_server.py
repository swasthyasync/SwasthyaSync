import uvicorn
import os
import signal
import sys
from main import app, PORT, HOST

def run_server():
    config = uvicorn.Config(
        app=app,
        host=HOST,
        port=PORT,
        log_level="info",
        reload=False,
        workers=1
    )
    
    server = uvicorn.Server(config)
    
    try:
        # Start the server without signal handlers (uvicorn handles them)
        server.run()
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print(f"🚀 Starting ML service on http://{HOST}:{PORT}")
    run_server()