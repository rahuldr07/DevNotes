from fastapi import FastAPI

app = FastAPI(title="Blog Platform API")

@app.get("/health")
def health():
	return {"Status":"Good"}

