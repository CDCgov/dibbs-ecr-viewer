# eCR Viewer Cloud Cost Estimation Guide \- Azure  

This guide is designed to help public health IT administrators calculate, verify, and customize infrastructure costs for deploying the eCR Viewer on Microsoft Azure. It provides baseline estimates as a starting point. To determine your actual costs, you will need to plug your specific operational parameters directly into the [Azure cloud calculator](https://azure.microsoft.com/en-us/pricing/calculator/?ef_id=_k_Cj0KCQjwr4jSBhCSARIsAOX1E-Kk22aJ5waz0G2df3z1vppnEehKH4xYujxqqIXYbIjV8HFGIFw1FCkaAsXXEALw_wcB_k_&OCID=AIDcmm5edswduu_SEM__k_Cj0KCQjwr4jSBhCSARIsAOX1E-Kk22aJ5waz0G2df3z1vppnEehKH4xYujxqqIXYbIjV8HFGIFw1FCkaAsXXEALw_wcB_k_&gad_source=1&gad_campaignid=21496728177&gbraid=0AAAAADcJh_t8oowc4rfoa2ddcK347hOwK&gclid=Cj0KCQjwr4jSBhCSARIsAOX1E-Kk22aJ5waz0G2df3z1vppnEehKH4xYujxqqIXYbIjV8HFGIFw1FCkaAsXXEALw_wcB).

# Baseline workload parameters

To provide a foundational cost reference, the following average baseline metrics represent a standard production-ready environment:

- **Target Ingestion Rate:** 500 eCR documents per day
- **Average Document Size:** 300 KB per eCR.
- **Monthly Payload Counts:** 15,000 incoming eCRs per month (500 eCRs \* 30 days).
- **Monthly Total Throughput:** \~5 GB of data ingested monthly
- **Cumulative Storage Projections:** 60 GB total at the end of Year 1 (5 GB/month \* 12 months).
- **Environment Architecture:** Multi-environment deployment model consisting of 2 segregated environments (Production and Test).

# Cost breakdown by component

The total estimated cost for a single environment based on the averages above is **$681.67 per month**. For a standard public health department deployment utilizing 2 environments, we estimate that the cost is around **$16,360.08 per year.**

| Azure Component                                    | Pipeline Functionality                                                                                  | Monthly Cost (USD) |
| :------------------------------------------------- | :------------------------------------------------------------------------------------------------------ | :----------------- |
| **Azure Container Apps (ACA)**                     | Executes the core DIBBs pipeline microservices via a managed, serverless container runtime.             | $224.81            |
| **Azure Container Registry**                       | Stores application container images (\~6 GB storage).                                                   | $20.01             |
| **Azure Blob Storage**                             | Secure object storage for raw HL7/CDA eCR files and processed JSON files.                               | $47.86             |
| **Azure Monitor**                                  | System monitoring, health checks, and 10 GB of log data ingestion per month.                            | $72.50             |
| **Azure Virtual Network**                          | HIPAA-compliant isolated networking, private subnets, and routing infrastructure.                       | $40                |
| **Azure Application Gateway**                      | Combined load balancer and Web Application Firewall to distribute traffic and block malicious requests. | $273.31            |
| **Database (optional depending on setup)1**        | Stores metadata for the eCR Library, with Zone Redundancy enabled.                                      | $468.12            |
| **Azure Key Vault (optional, but best practice)**  | Managed encryption keys and secrets used for storage encryption, log encryption, and event routing.     | $3.18              |
| **Azure Event Grid (optional, but best practice)** | Event notifications for cloud services with no data transfer to a different region.                     | $29.20             |
| **Estimated Monthly Subtotal**                     | **Per Enviroment**                                                                                      | $681.67            |

1 This pricing includes zone redundancy and nominal values for database storage and point-in-time restore. This price is not included in your final total, and it is for informational purposes only.

# Detailed breakdown

The baseline estimate of **$681.67/month** is derived from specific sizing models. Understanding this underlying logic allows your jurisdiction to scale these numbers up or down inside the cloud calculator based on your local volume.

## Azure Container Apps (ACA)

- **Cost Allocation:** $224.81
- **Estimation Logic:** This is a dedicated profile that reserves a set amount of vCPUs and memory. D4 profiles allocate 4 vCPU and 16 GiB of memory. You can elect to save costs using a “Consumption” profile and scaling replicas to 0 when not in use, but we do not recommend this approach. “Consumption” workloads share hardware with other customers, potentially causing data security concerns. We recommend checking with your legal and compliance teams if you choose to use a “Consumption” profile.

## Azure Container Registry

- **Cost Allocation:** $20.01
- **Estimation Logic:** Pricing based on standard tier. Standard registries satisfy the needs of many production scenarios

## Azure Blob Storage

- **Cost Allocation:** $47.86
- **Estimation Logic:** Pricing is based on 1 TB of data retrieval, 1 TB of data storage, 100,000 eCR write operations, and 100,000 eCR read operations.

## Azure Monitor

- **Cost Allocation:** $72.50
- **Estimation Logic:** This estimate represents the upper bound of expected usage, assuming extensive audit logs are maintained. Your actual usage may be lower based on your internal policies.

## Azure Virtual Network

- **Cost Allocation:** $40
- **Estimation Logic:** Pricing is based oﬀ a peering with another Virtual Network, such as the one internal to your organization. This pricing assumes a bidirectional peering with 1 TB of data transfer.

## Azure Application Gateway

- **Cost Allocation:** $273.31
- **Estimation Logic:** Our default configuration assumes that you will need to access DIBBs resources via the public internet, which is why we have implemented additional Web Application Firewall protections on this gateway. You can choose to customize your installation after initial implementation, at your own risk and support, to remove public internet access, which will allow you to cut these costs. You can also choose to leave your gateway public and remove the WAF; this configuration is not recommended for production use, unless you will pass traﬃc through another firewall on its way to your gateway.

## Database (Optional)

- **Cost Allocation:** $468.12
- **Estimation Logic:** This pricing for Azure SQL Database single database deployment type includes zone redundancy and nominal values for database storage and point-in-time restore. The computer tier is provisioned in order to provide dedicated resources. This price is not included in the baseline estimated total, and it is for informational purposes only.

## Azure Key Vault

- **Cost Allocation:** $3.18
- **Estimation Logic:** Pricing is based on using the standard tier. Use the service tier based on organization security and compliance requirements

## Azure Event Grid

- **Cost Allocation:** $29.20
- **Estimation Logic:** Pricing is based on using the standard tier which has automatic scaling of throughput units based on real-time event traffic and resource utilization without manual intervention and trigger actions based on custom application events. This price is not included in your final total, and it is for informational purposes only.
