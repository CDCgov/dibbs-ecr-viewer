# eCR Viewer Cloud Cost Estimation Guide \- AWS  

This guide is designed to help public health IT administrators calculate, verify, and customize infrastructure costs for deploying the eCR Viewer on Amazon Web Services (AWS). It provides baseline estimates as a starting point. To determine your actual costs, you will need to plug your specific operational parameters directly into the [AWS cloud calculator](https://calculator.aws/#/).

# Baseline workload parameters

To provide a foundational cost reference, the following average baseline metrics represent a standard production-ready environment:

* **Target Ingestion Rate:** 500 eCR documents per day   
* **Average Document Size:** 300 KB per eCR.  
* **Monthly Payload Counts:** 15,000 incoming eCRs per month (500 eCRs \* 30 days).  
* **Monthly Total Throughput:** \~5 GB of data ingested monthly  
* **Cumulative Storage Projections:** 60 GB total at the end of Year 1 (5 GB/month \* 12 months).  
* **Environment Architecture:** Multi-environment deployment model consisting of 2 segregated environments (Production and Test).

# Cost breakdown by component

The total estimated cost for a single environment based on the averages above is **$298.36 per month**. For a standard public health department deployment utilizing 2 environments, we estimate that the cost is around **$7,160 per year.**

| AWS Component | Pipeline Functionality | Monthly Cost (USD) |
| :---- | :---- | :---- |
| Elastic Container Service (ECS) | Executes the core DIBBs pipeline microservices via AWS Fargate serverless compute. | $150.16 |
| Elastic Container Registry (ECR) | Stores application container images (\~6 GB storage). | $0.60 |
| Simple Storage Service (S3) | Secure blob storage for raw HL7/CDA eCR files and processed JSON files. | $1.49 |
| Amazon CloudWatch | System monitoring, health checks, and 10 GB of log data ingestion per month. | $9.27 |
| Virtual Private Cloud (VPC) | HIPAA-compliant isolated networking, private subnets, and routing infrastructure. | $0.00 (Free Tier) |
| Elastic Load Balancer (ELB) | Distributes clinical viewing and ingestion traffic across application containers. | $16.47 |
| Web Application Firewall (WAF) | Security layer that rejects potentially malicious requests | $45.00 |
| Database (optional depending on setup) | Stores metadata for the eCR Library, with multi-AZ enabled | $70.00 |
| Key Management Service (KMS, optional but best practice)  | Managed encryption keys used for S3 bucket encryption, log encryption, and SNS | $5.37 |
| Simple Notification Service (SNS, optional but best practice)  | Event notifications for cloud services  (with no data transfer to a different region) | $0.00 (Free Tier) |
| Estimated Monthly Subtotal | Per Environment | $298.36 |

# Detailed breakdown

The baseline estimate of **$298.36/month** is derived from specific sizing models. Understanding this underlying logic allows your jurisdiction to scale these numbers up or down inside the cloud calculator based on your local volume.

## Elastic Container Service (ECS)

* **Cost Allocation:** $150.16 / month  
* **Estimation Logic:** Because the containerized services in the processing pipeline run part-time rather than continuously, the baseline utilizes AWS Fargate (a managed, serverless compute model) for cost efficiency. Large numbers of eCRs may result in auto-scaling events that increase the number of containers running at a time.  
* **Workload Modeling:** The calculation splits the containers into two operational profiles based on real-world clinical behavior:  
  * **The Data Pipeline (Part-Time):** Data is heavily concentrated during standard business hours, averaging 1 payload request per minute across an 8-hour window (500 requests ÷ 8 hours ÷ 60 minutes). To safely absorb off-hours clinical reporting spikes, the model builds in a buffer, pricing the pipeline at 10 hours per day. This accounts for 5-6 separate tasks running in parallel (one for each microservice container in the data pipeline, depending on whether HA Proxy is turned on).  
  * **The eCR Viewer (Full-Time):** One container service (the core eCR Viewer container) is priced to run continuously (24/7). This ensures that whenever any requests are made, the application responds instantly.

## Elastic Container Registry (ECR)

* **Cost Allocation:** Free  
* **Estimation Logic:** The application stack requires secure storage for 5 microservice container images. Each container image averages 1 GB, with the largest container reaching 1.5 GB. This aggregates to a total image footprint of 6 GB/month, which stays within the standard AWS Free Tier boundaries for container registries.

## Simple Storage Service (S3)

* **Cost Allocation:** $1.49 / month  
* **Estimation Logic:** This component represents a deliberate, safe overestimate. Based on monthly data inflows, approximately 4.5 GB of raw clinical data is ingested per month (15,000 eCRs \* 300 KB), which rounds up to 5 GB/month. Over a 12-month period, the total data footprint will reach 60 GB (5 GB \* 12 months). Because cloud calculators price a single static point rather than a rolling, cumulative monthly curve, the baseline is safely estimated against the full Year 1 total of 60 GB.

## Amazon CloudWatch

* **Cost Allocation:** $9.27 / month  
* **Estimation Logic:** For every individual clinical document moving through the pipeline, the system tracks performance across 6 unique application layers (modeled as 6 "custom metrics" in the estimator). Additionally, the baseline factors in an estimated log file volume of 10 GB per month—an intentional overestimate to ensure verbose diagnostic tracking is covered without exceeding budget lines.

## Virtual Private Cloud (VPC)

* **Cost Allocation:** Free  
* **Estimation Logic:** For a standard deployment that provides 24/7 secure application availability to a localized, defined group of public health users, the basic networking setup operates within the free tier thresholds for isolated virtual network routing. Assumption is that VPC interface endpoints are not enabled.

## Elastic Load Balancer (ELB)

* **Cost Allocation:** $16.47 / month  
* **Estimation Logic:** To ensure external healthcare endpoints can reliably transmit incoming eCRs, an Application Load Balancer is used to route traffic. The pricing calculation assumes a total data processing volume of approximately 5 GB per month, mirroring the total aggregate throughput of the incoming data payloads.

## Web Application Firewall (WAF)

* **Cost Allocation:** $45.00 / month  
* **Estimation Logic:** Public health applications handling protected health information (PHI) require robust protection. This security layer shields the Application Load Balancer from malicious requests. The baseline estimate accounts for a standard AWS WAF Web ACL (Access Control List) base fee plus a selection of core managed rule groups (such as protections against SQL injection, cross-site scripting, and common vulnerabilities) scaled to accommodate standard baseline web traffic.

## Database (Optional)

* **Cost Allocation:** $70.00 / month  
* **Estimation Logic:** While the core data pipeline primarily ingests and holds files within object storage, a relational database layer would need to be deployed to store, query, and index metadata for the eCR Library. This estimate prices a small, cost-effective database instance with Multi-AZ (Availability Zone) replication enabled, ensuring metadata remains fully accessible even during an infrastructure outage in a primary data center.

## Key Management Service (KMS) 

* **Cost Allocation:** $5.37 / month  
* **Estimation Logic:** AWS Key Management Service (KMS) keys are used to manage encryption across your S3 buckets, CloudWatch logs, and notification topics. The calculation assumes a foundational setup of 5 customer-managed keys and a safe operational buffer of 100,000 API requests to cover automated encryption and decryption cycles as data cycles through the pipeline.

## Simple Notification Service (SNS)

* **Cost Allocation:** Free   
* **Estimation Logic:** Amazon Simple Notification Service (SNS) provides the framework for event-driven alerts, such as flagging pipeline processing errors or notifying systems of successful ingestion events. Because the volume of operational events maps to the 15,000 monthly eCR baseline, the traffic falls within the standard AWS Free Tier allowance (which includes 1 million free publish operations per month), assuming all notifications remain within the primary deployment region.

