from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .database import DEFAULT_DATABASE, init_app as init_database_app
from .routes.admin import admin_bp
from .routes.health import health_bp
from .routes.locations import locations_bp
from .routes.products import products_bp
from .routes.reports import reports_bp
from .routes.reservations import reservations_bp
from .routes.search import search_bp


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        DATABASE=os.environ.get("RU_RELIEF_DATABASE", str(DEFAULT_DATABASE)),
        JSON_SORT_KEYS=False,
        MAX_CONTENT_LENGTH=5 * 1024 * 1024,
    )
    if test_config:
        app.config.update(test_config)

    init_database_app(app)

    for blueprint in (
        products_bp,
        locations_bp,
        search_bp,
        health_bp,
        reports_bp,
        reservations_bp,
        admin_bp,
    ):
        app.register_blueprint(blueprint)

    @app.get("/api")
    def api_home():
        return jsonify(
            {
                "name": "RU Relief API",
                "status": "ok",
                "prototypeDisclosure": (
                    "Inventory, medicine availability, reservations, and health-item retail swipes "
                    "are simulated features of a proposed Rutgers program."
                ),
            }
        )

    @app.after_request
    def allow_frontend(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Demo-Role"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"
        return response

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return jsonify({"error": error.name, "message": error.description}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        if app.config.get("TESTING"):
            raise error
        app.logger.exception("Unhandled API error")
        return jsonify({"error": "Internal Server Error", "message": "The request could not be completed."}), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

