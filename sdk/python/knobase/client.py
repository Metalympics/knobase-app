"""Knobase Python SDK - Official client for the Knobase API."""

from __future__ import annotations

import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Any, Optional


class KnobaseError(Exception):
    """Error returned by the Knobase API."""

    def __init__(self, message: str, code: str = "UNKNOWN", status: int = 0, details: Any = None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.details = details


class KnobaseClient:
    """Client for interacting with the Knobase REST API.

    Args:
        api_url: Base URL of your Knobase instance (e.g. "http://localhost:3000")
        api_key: API key for authentication (Bearer token)
        timeout: Request timeout in seconds (default: 30)
    """

    def __init__(self, api_url: str, api_key: str, timeout: int = 30):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def _request(self, method: str, path: str, body: Optional[dict] = None) -> Any:
        url = f"{self.api_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "knobase-python/1.0",
        }

        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            try:
                err_body = json.loads(e.read().decode())
            except Exception:
                err_body = {}
            raise KnobaseError(
                err_body.get("error", f"HTTP {e.code}"),
                err_body.get("code", "UNKNOWN"),
                e.code,
                err_body.get("details"),
            ) from e
        except urllib.error.URLError as e:
            raise KnobaseError(f"Connection error: {e.reason}", "CONNECTION_ERROR") from e

    # --- Documents ---

    def list_docs(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        tags: Optional[list[str]] = None,
        collection: Optional[str] = None,
    ) -> dict:
        """List documents with pagination and optional filtering."""
        params: dict[str, str] = {"limit": str(limit), "offset": str(offset)}
        if search:
            params["search"] = search
        if tags:
            params["tags"] = ",".join(tags)
        if collection:
            params["collection"] = collection
        qs = urllib.parse.urlencode(params)
        return self._request("GET", f"/api/v1/documents?{qs}")

    def get_doc(self, doc_id: str) -> dict:
        """Get a single document by ID."""
        return self._request("GET", f"/api/v1/documents/{doc_id}")

    def create_doc(
        self,
        title: str,
        content: str = "",
        tags: Optional[list[str]] = None,
        parent_id: Optional[str] = None,
    ) -> dict:
        """Create a new document."""
        body: dict[str, Any] = {"title": title, "content": content}
        if tags:
            body["tags"] = tags
        if parent_id:
            body["parentId"] = parent_id
        return self._request("POST", "/api/v1/documents", body)

    def update_doc(
        self,
        doc_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        tags: Optional[list[str]] = None,
    ) -> dict:
        """Update an existing document."""
        body: dict[str, Any] = {}
        if title is not None:
            body["title"] = title
        if content is not None:
            body["content"] = content
        if tags is not None:
            body["tags"] = tags
        return self._request("PATCH", f"/api/v1/documents/{doc_id}", body)

    def delete_doc(self, doc_id: str) -> dict:
        """Delete a document."""
        return self._request("DELETE", f"/api/v1/documents/{doc_id}")

    # --- Search ---

    def search(
        self,
        query: str,
        tags: Optional[list[str]] = None,
        author: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> dict:
        """Full-text search across documents."""
        body: dict[str, Any] = {"query": query, "limit": limit, "offset": offset}
        filters: dict[str, Any] = {}
        if tags:
            filters["tags"] = tags
        if author:
            filters["author"] = author
        if date_from:
            filters["dateFrom"] = date_from
        if date_to:
            filters["dateTo"] = date_to
        if filters:
            body["filters"] = filters
        return self._request("POST", "/api/v1/search", body)

    # --- Collections ---

    def list_collections(self) -> dict:
        """List all collections."""
        return self._request("GET", "/api/v1/collections")

    def create_collection(
        self,
        name: str,
        description: str = "",
        icon: str = "📁",
        color: str = "#6B7280",
        document_ids: Optional[list[str]] = None,
    ) -> dict:
        """Create a new collection."""
        body: dict[str, Any] = {
            "name": name,
            "description": description,
            "icon": icon,
            "color": color,
        }
        if document_ids:
            body["documentIds"] = document_ids
        return self._request("POST", "/api/v1/collections", body)

    # --- Agents ---

    def list_agents(self) -> dict:
        """List available AI agents."""
        return self._request("GET", "/api/v1/agents")

    def invoke_agent(
        self,
        action: str,
        content: Optional[str] = None,
        context: Optional[str] = None,
        agent_id: Optional[str] = None,
        document_id: Optional[str] = None,
    ) -> dict:
        """Invoke an AI agent action."""
        body: dict[str, Any] = {"action": action}
        if content:
            body["content"] = content
        if context:
            body["context"] = context
        if agent_id:
            body["agentId"] = agent_id
        if document_id:
            body["documentId"] = document_id
        return self._request("POST", "/api/v1/agents", body)

    # --- Webhooks ---

    def list_webhooks(self) -> dict:
        """List configured webhooks."""
        return self._request("GET", "/api/v1/webhooks")

    def create_webhook(
        self,
        url: str,
        events: list[str],
        secret: Optional[str] = None,
        active: bool = True,
    ) -> dict:
        """Create a new webhook."""
        body: dict[str, Any] = {"url": url, "events": events, "active": active}
        if secret:
            body["secret"] = secret
        return self._request("POST", "/api/v1/webhooks", body)
