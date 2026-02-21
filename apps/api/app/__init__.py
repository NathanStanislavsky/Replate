from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from app.config import Config

db = SQLAlchemy()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

    db.init_app(app)

    from app.routes.listings import listings_bp
    from app.routes.requests import requests_bp
    from app.routes.allocations import allocations_bp
    from app.routes.partners import partners_bp
    from app.routes.pickup import pickup_bp
    from app.routes.users import users_bp

    app.register_blueprint(listings_bp, url_prefix="/api")
    app.register_blueprint(requests_bp, url_prefix="/api")
    app.register_blueprint(allocations_bp, url_prefix="/api")
    app.register_blueprint(partners_bp, url_prefix="/api")
    app.register_blueprint(pickup_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")

    with app.app_context():
        db.create_all()
        from app.models import User

        if User.query.count() == 0:
            db.session.add(User(email="buyer@example.com", role="buyer"))
            db.session.add(
                User(
                    email="business@example.com",
                    role="business",
                    business_name="Boston Beanery",
                )
            )
            db.session.commit()

    return app
