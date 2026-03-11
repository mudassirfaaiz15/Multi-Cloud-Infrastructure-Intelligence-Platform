"""
Google Cloud Platform Resource Scanner
Scans GCP resources and returns normalized resource objects.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


# ============================================================================
# NORMALIZED RESOURCE SCHEMA (matches AWS scanner output shape)
# ============================================================================

def make_resource(
    resource_id: str,
    name: str,
    resource_type: str,
    region: str,
    state: str,
    provider: str = "gcp",
    cost_estimate: float = 0.0,
    details: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    return {
        "id": resource_id,
        "name": name,
        "resource_type": resource_type,
        "region": region,
        "state": state,
        "provider": provider,
        "cost_estimate": cost_estimate,
        "details": details or {},
        "tags": tags or {},
        "scanned_at": datetime.utcnow().isoformat(),
    }


# ============================================================================
# GCP SCANNER CLASS
# ============================================================================

class GCPResourceScanner:
    """
    Scans GCP resources using the Google API Python client library.
    Falls back to demo data if credentials are not available or API calls fail.
    """

    def __init__(self, service_account_info: Optional[Dict[str, Any]] = None, project_id: Optional[str] = None):
        self.project_id = project_id
        self.service_account_info = service_account_info
        self._credentials = None
        self._services: Dict[str, Any] = {}

    def _get_credentials(self):
        """Build Google credentials from service account info."""
        if self._credentials:
            return self._credentials

        if not self.service_account_info:
            raise ValueError("GCP service account credentials not provided")

        try:
            from google.oauth2 import service_account
            scopes = [
                "https://www.googleapis.com/auth/cloud-platform",
                "https://www.googleapis.com/auth/compute.readonly",
            ]
            self._credentials = service_account.Credentials.from_service_account_info(
                self.service_account_info, scopes=scopes
            )
            return self._credentials
        except ImportError:
            raise ImportError("google-auth is not installed. Run: pip install google-auth google-api-python-client")

    def _get_service(self, service_name: str, version: str):
        """Get or create a Google API service client."""
        key = f"{service_name}_{version}"
        if key not in self._services:
            try:
                from googleapiclient.discovery import build
                creds = self._get_credentials()
                self._services[key] = build(service_name, version, credentials=creds)
            except Exception as e:
                logger.error(f"Failed to build GCP service {service_name}: {e}")
                raise
        return self._services[key]

    # --------------------------------------------------------------------------
    # Compute Engine
    # --------------------------------------------------------------------------

    def scan_compute_instances(self) -> List[Dict[str, Any]]:
        """Scan all Compute Engine VM instances across all zones."""
        resources = []
        try:
            compute = self._get_service("compute", "v1")
            result = compute.instances().aggregatedList(project=self.project_id).execute()

            for zone_name, zone_data in result.get("items", {}).items():
                for instance in zone_data.get("instances", []):
                    zone = zone_name.split("/")[-1]
                    machine_type = instance.get("machineType", "").split("/")[-1]
                    status = instance.get("status", "UNKNOWN").lower()

                    # Estimate cost (simplified: n1-standard-1 ≈ $24/mo)
                    cost_map = {
                        "n1-standard-1": 24.0, "n1-standard-2": 48.0, "n1-standard-4": 96.0,
                        "n2-standard-2": 58.0, "n2-standard-4": 116.0,
                        "e2-micro": 7.0, "e2-small": 14.0, "e2-medium": 28.0,
                    }
                    cost = cost_map.get(machine_type, 30.0)

                    resources.append(make_resource(
                        resource_id=instance.get("id", ""),
                        name=instance.get("name", ""),
                        resource_type="GCP_ComputeInstance",
                        region=zone,
                        state=status,
                        cost_estimate=cost,
                        details={
                            "machine_type": machine_type,
                            "zone": zone,
                            "network_interfaces": len(instance.get("networkInterfaces", [])),
                            "disks": len(instance.get("disks", [])),
                        },
                    ))
        except Exception as e:
            logger.warning(f"scan_compute_instances failed: {e}")

        return resources

    # --------------------------------------------------------------------------
    # Cloud Storage
    # --------------------------------------------------------------------------

    def scan_storage_buckets(self) -> List[Dict[str, Any]]:
        """Scan all Cloud Storage buckets."""
        resources = []
        try:
            storage = self._get_service("storage", "v1")
            result = storage.buckets().list(project=self.project_id).execute()

            for bucket in result.get("items", []):
                location = bucket.get("location", "US").lower()
                resources.append(make_resource(
                    resource_id=bucket.get("id", ""),
                    name=bucket.get("name", ""),
                    resource_type="GCP_StorageBucket",
                    region=location,
                    state="active",
                    cost_estimate=5.0,  # $0.02/GB/mo, ~250GB average
                    details={
                        "storage_class": bucket.get("storageClass", "STANDARD"),
                        "location_type": bucket.get("locationType", ""),
                        "versioning_enabled": bucket.get("versioning", {}).get("enabled", False),
                        "public_access_prevention": bucket.get("iamConfiguration", {}).get("publicAccessPrevention", "inherited"),
                    },
                ))
        except Exception as e:
            logger.warning(f"scan_storage_buckets failed: {e}")

        return resources

    # --------------------------------------------------------------------------
    # Cloud SQL
    # --------------------------------------------------------------------------

    def scan_cloud_sql(self) -> List[Dict[str, Any]]:
        """Scan all Cloud SQL instances."""
        resources = []
        try:
            sql = self._get_service("sqladmin", "v1")
            result = sql.instances().list(project=self.project_id).execute()

            for instance in result.get("items", []):
                tier = instance.get("settings", {}).get("tier", "")
                resources.append(make_resource(
                    resource_id=instance.get("name", ""),
                    name=instance.get("name", ""),
                    resource_type="GCP_CloudSQL",
                    region=instance.get("region", ""),
                    state=instance.get("state", "UNKNOWN").lower(),
                    cost_estimate=50.0,  # Typical small instance
                    details={
                        "database_version": instance.get("databaseVersion", ""),
                        "tier": tier,
                        "availability_type": instance.get("settings", {}).get("availabilityType", "ZONAL"),
                        "storage_type": instance.get("settings", {}).get("dataDiskType", "PD_SSD"),
                    },
                ))
        except Exception as e:
            logger.warning(f"scan_cloud_sql failed: {e}")

        return resources

    # --------------------------------------------------------------------------
    # Cloud Functions
    # --------------------------------------------------------------------------

    def scan_cloud_functions(self) -> List[Dict[str, Any]]:
        """Scan all Cloud Functions."""
        resources = []
        try:
            functions = self._get_service("cloudfunctions", "v1")
            parent = f"projects/{self.project_id}/locations/-"
            result = functions.projects().locations().functions().list(parent=parent).execute()

            for fn in result.get("functions", []):
                location = fn.get("name", "").split("/")[3]
                resources.append(make_resource(
                    resource_id=fn.get("name", ""),
                    name=fn.get("name", "").split("/")[-1],
                    resource_type="GCP_CloudFunction",
                    region=location,
                    state=fn.get("status", "UNKNOWN").lower(),
                    cost_estimate=0.5,  # Very cheap for moderate usage
                    details={
                        "runtime": fn.get("runtime", ""),
                        "entry_point": fn.get("entryPoint", ""),
                        "memory_mb": fn.get("availableMemoryMb", 256),
                        "timeout": fn.get("timeout", "60s"),
                    },
                ))
        except Exception as e:
            logger.warning(f"scan_cloud_functions failed: {e}")

        return resources

    # --------------------------------------------------------------------------
    # BigQuery
    # --------------------------------------------------------------------------

    def scan_bigquery_datasets(self) -> List[Dict[str, Any]]:
        """Scan all BigQuery datasets."""
        resources = []
        try:
            bq = self._get_service("bigquery", "v2")
            result = bq.datasets().list(projectId=self.project_id).execute()

            for dataset in result.get("datasets", []):
                ref = dataset.get("datasetReference", {})
                dataset_id = ref.get("datasetId", "")
                location = dataset.get("location", "US")
                resources.append(make_resource(
                    resource_id=f"{self.project_id}:{dataset_id}",
                    name=dataset_id,
                    resource_type="GCP_BigQueryDataset",
                    region=location.lower(),
                    state="active",
                    cost_estimate=10.0,
                    details={
                        "project_id": ref.get("projectId", ""),
                        "friendly_name": dataset.get("friendlyName", ""),
                        "location": location,
                    },
                ))
        except Exception as e:
            logger.warning(f"scan_bigquery_datasets failed: {e}")

        return resources

    # --------------------------------------------------------------------------
    # Main Scan
    # --------------------------------------------------------------------------

    def scan(self) -> Dict[str, Any]:
        """
        Perform a full GCP resource scan.
        If credentials are missing, returns demo data.
        """
        if not self.service_account_info or not self.project_id:
            return self._demo_scan_result()

        resources = []
        errors = []

        scanners = [
            ("compute_instances", self.scan_compute_instances),
            ("storage_buckets", self.scan_storage_buckets),
            ("cloud_sql", self.scan_cloud_sql),
            ("cloud_functions", self.scan_cloud_functions),
            ("bigquery_datasets", self.scan_bigquery_datasets),
        ]

        for name, scanner_fn in scanners:
            try:
                result = scanner_fn()
                resources.extend(result)
                logger.info(f"GCP {name}: found {len(result)} resources")
            except Exception as e:
                error_msg = f"Failed to scan {name}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)

        summary = self._build_summary(resources)

        return {
            "success": True,
            "provider": "gcp",
            "project_id": self.project_id,
            "timestamp": datetime.utcnow().isoformat(),
            "resources": resources,
            "summary": summary,
            "errors": errors,
        }

    def _build_summary(self, resources: List[Dict[str, Any]]) -> Dict[str, Any]:
        type_counts: Dict[str, int] = {}
        total_cost = 0.0

        for r in resources:
            rtype = r["resource_type"]
            type_counts[rtype] = type_counts.get(rtype, 0) + 1
            total_cost += r.get("cost_estimate", 0.0)

        return {
            "total_resources": len(resources),
            "by_type": type_counts,
            "estimated_monthly_cost": round(total_cost, 2),
        }

    def _demo_scan_result(self) -> Dict[str, Any]:
        """Return realistic demo data when no GCP credentials are configured."""
        demo_resources = [
            make_resource("gcp-vm-001", "prod-web-server-1", "GCP_ComputeInstance", "us-central1-a", "running", cost_estimate=48.0, details={"machine_type": "n1-standard-2"}),
            make_resource("gcp-vm-002", "prod-api-server-1", "GCP_ComputeInstance", "us-central1-b", "running", cost_estimate=48.0, details={"machine_type": "n1-standard-2"}),
            make_resource("gcp-vm-003", "staging-server", "GCP_ComputeInstance", "us-east1-b", "terminated", cost_estimate=0.0, details={"machine_type": "e2-medium"}),
            make_resource("gcp-bucket-001", "prod-assets-bucket", "GCP_StorageBucket", "us", "active", cost_estimate=12.5, details={"storage_class": "STANDARD", "public_access_prevention": "enforced"}),
            make_resource("gcp-bucket-002", "backups-bucket", "GCP_StorageBucket", "us-central1", "active", cost_estimate=3.2, details={"storage_class": "NEARLINE", "public_access_prevention": "enforced"}),
            make_resource("gcp-bucket-003", "logs-archive", "GCP_StorageBucket", "us", "active", cost_estimate=1.8, details={"storage_class": "COLDLINE", "public_access_prevention": "enforced"}),
            make_resource("gcp-sql-001", "prod-postgres-db", "GCP_CloudSQL", "us-central1", "runnable", cost_estimate=95.0, details={"database_version": "POSTGRES_14", "tier": "db-n1-standard-2"}),
            make_resource("gcp-sql-002", "dev-mysql-db", "GCP_CloudSQL", "us-east1", "runnable", cost_estimate=30.0, details={"database_version": "MYSQL_8_0", "tier": "db-f1-micro"}),
            make_resource("gcp-fn-001", "process-uploads", "GCP_CloudFunction", "us-central1", "active", cost_estimate=0.5, details={"runtime": "python310", "memory_mb": 256}),
            make_resource("gcp-fn-002", "send-notifications", "GCP_CloudFunction", "us-central1", "active", cost_estimate=0.3, details={"runtime": "nodejs18", "memory_mb": 128}),
            make_resource("gcp-fn-003", "data-processor", "GCP_CloudFunction", "us-east1", "active", cost_estimate=1.2, details={"runtime": "python310", "memory_mb": 512}),
            make_resource("gcp-bq-001", "analytics_dataset", "GCP_BigQueryDataset", "us", "active", cost_estimate=8.0, details={"location": "US"}),
            make_resource("gcp-bq-002", "user_events", "GCP_BigQueryDataset", "us", "active", cost_estimate=4.5, details={"location": "US"}),
        ]

        return {
            "success": True,
            "provider": "gcp",
            "project_id": "demo-project",
            "timestamp": datetime.utcnow().isoformat(),
            "resources": demo_resources,
            "summary": self._build_summary(demo_resources),
            "errors": [],
            "demo_mode": True,
        }
