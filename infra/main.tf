terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud SQL PostgreSQL Instance
resource "google_sql_database_instance" "yomu" {
  name             = "yomu-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-f1-micro"
    availability_type = "ZONAL"

    ip_configuration {
      ipv4_enabled = false
      private_network = google_compute_network.yomu.id
    }

    backup_configuration {
      enabled = true
      point_in_time_recovery_enabled = true
    }

    database_flags {
      name  = "max_connections"
      value = "50"
    }
  }

  deletion_protection = var.environment == "prod"
}

resource "google_sql_database" "yomu" {
  name     = "yomu"
  instance = google_sql_database_instance.yomu.name
}

resource "google_sql_user" "yomu" {
  name     = "yomu"
  instance = google_sql_database_instance.yomu.name
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# VPC Network
resource "google_compute_network" "yomu" {
  name                    = "yomu-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "yomu" {
  name          = "yomu-${var.environment}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.yomu.id

  private_ip_google_access = true
}

# VPC Connector for Cloud Run
resource "google_vpc_access_connector" "yomu" {
  name          = "yomu-${var.environment}"
  region        = var.region
  network       = google_compute_network.yomu.name
  ip_cidr_range = "10.8.0.0/28"
}

# Memorystore Redis (Valkey-compatible)
resource "google_redis_instance" "yomu" {
  name           = "yomu-${var.environment}"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  authorized_network = google_compute_network.yomu.id

  redis_version = "REDIS_7_0"
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "yomu" {
  name     = "yomu-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.project_id}/yomu:latest"

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : "development"
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.yomu.name}:${random_password.db_password.result}@${google_sql_database_instance.yomu.private_ip_address}:5432/${google_sql_database.yomu.name}"
      }

      env {
        name  = "VALKEY_URL"
        value = "redis://${google_redis_instance.yomu.host}:${google_redis_instance.yomu.port}"
      }

      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_id.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.google_client_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SESSION_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.session_secret.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.yomu.id
      egress    = "ALL_TRAFFIC"
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }
}

# Secret Manager
resource "google_secret_manager_secret" "google_client_id" {
  secret_id = "yomu-${var.environment}-google-client-id"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_client_secret" {
  secret_id = "yomu-${var.environment}-google-client-secret"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "session_secret" {
  secret_id = "yomu-${var.environment}-session-secret"

  replication {
    auto {}
  }
}

# IAM for Cloud Run to access secrets
resource "google_secret_manager_secret_iam_member" "google_client_id" {
  secret_id = google_secret_manager_secret.google_client_id.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_cloud_run_v2_service.yomu.template[0].service_account}"
}

resource "google_secret_manager_secret_iam_member" "google_client_secret" {
  secret_id = google_secret_manager_secret.google_client_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_cloud_run_v2_service.yomu.template[0].service_account}"
}

resource "google_secret_manager_secret_iam_member" "session_secret" {
  secret_id = google_secret_manager_secret.session_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_cloud_run_v2_service.yomu.template[0].service_account}"
}

# Outputs
output "cloud_run_url" {
  value = google_cloud_run_v2_service.yomu.uri
}

output "database_connection_name" {
  value = google_sql_database_instance.yomu.connection_name
}

output "redis_host" {
  value = google_redis_instance.yomu.host
}
