"""
JSON Storage

Stores scraped provider data to JSON files.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from ..config import get_settings
from ..schemas import ScrapedProvider, ScrapeRunStats


class JsonStore:
    """
    Stores scraped data to JSON files.

    File structure:
    - output/providers/{city}_{category}_{timestamp}.json
    - output/runs/{run_id}.json
    """

    def __init__(self, output_dir: Optional[Path] = None):
        self.settings = get_settings()
        self.output_dir = output_dir or self.settings.output_dir
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        """Ensure output directories exist."""
        (self.output_dir / "providers").mkdir(parents=True, exist_ok=True)
        (self.output_dir / "runs").mkdir(parents=True, exist_ok=True)

    def _get_providers_path(self, city: str, category: str) -> Path:
        """Get path for providers file."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_city = city.lower().replace(" ", "_").replace(",", "")
        safe_category = category.lower()
        filename = f"{safe_city}_{safe_category}_{timestamp}.json"
        return self.output_dir / "providers" / filename

    def _get_run_path(self, run_id: str) -> Path:
        """Get path for run stats file."""
        return self.output_dir / "runs" / f"{run_id}.json"

    def save_providers(
        self,
        providers: list[ScrapedProvider],
        city: str,
        category: str,
    ) -> Path:
        """
        Save providers to JSON file.

        Args:
            providers: List of providers to save
            city: City name
            category: Service category

        Returns:
            Path to saved file
        """
        path = self._get_providers_path(city, category)

        data = {
            "metadata": {
                "city": city,
                "category": category,
                "count": len(providers),
                "exportedAt": datetime.utcnow().isoformat(),
            },
            "providers": [p.to_dict() for p in providers],
        }

        path.write_text(json.dumps(data, indent=2))
        return path

    def save_run_stats(self, stats: ScrapeRunStats) -> Path:
        """
        Save run statistics to JSON file.

        Args:
            stats: Run statistics

        Returns:
            Path to saved file
        """
        path = self._get_run_path(stats.run_id)
        path.write_text(json.dumps(stats.to_dict(), indent=2))
        return path

    def load_providers(self, path: Path) -> list[ScrapedProvider]:
        """
        Load providers from a JSON file.

        Args:
            path: Path to JSON file

        Returns:
            List of providers
        """
        data = json.loads(path.read_text())
        providers = []

        for p_data in data.get("providers", []):
            # Convert dict back to ScrapedProvider
            # This is a simplified version - production would use proper deserialization
            provider = ScrapedProvider(
                name=p_data["name"],
                address=p_data["address"],
                city=p_data["city"],
                state=p_data["state"],
                zip_code=p_data["zipCode"],
                country=p_data.get("country", "US"),
            )
            providers.append(provider)

        return providers

    def list_provider_files(self, city: Optional[str] = None) -> list[Path]:
        """
        List all provider files, optionally filtered by city.

        Args:
            city: Optional city filter

        Returns:
            List of file paths
        """
        pattern = "*.json"
        if city:
            safe_city = city.lower().replace(" ", "_").replace(",", "")
            pattern = f"{safe_city}_*.json"

        return sorted(
            (self.output_dir / "providers").glob(pattern),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

    def get_latest_run(self) -> Optional[ScrapeRunStats]:
        """Get the most recent run statistics."""
        runs_dir = self.output_dir / "runs"
        if not runs_dir.exists():
            return None

        files = sorted(runs_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            return None

        data = json.loads(files[0].read_text())

        return ScrapeRunStats(
            run_id=data["runId"],
            started_at=datetime.fromisoformat(data["startedAt"]),
            completed_at=datetime.fromisoformat(data["completedAt"]) if data.get("completedAt") else None,
            pages_attempted=data["stats"]["pagesAttempted"],
            pages_fetched=data["stats"]["pagesFetched"],
            providers_found=data["stats"]["providersFound"],
            providers_new=data["stats"]["providersNew"],
        )
