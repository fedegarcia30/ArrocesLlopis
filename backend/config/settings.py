import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'mysql+mysqlconnector://root:password@localhost/arroces_llopis'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    AIRTABLE_API_KEY = os.environ.get('AIRTABLE_API_KEY')
    AIRTABLE_BASE_ID = os.environ.get('AIRTABLE_BASE_ID')
