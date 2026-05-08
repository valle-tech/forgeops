| Gap                            | Current state                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real deployment implementation | `deploy` can trigger GitHub workflow or build Docker image, but deploy steps are placeholders in generated CI. ([GitHub][1])                      |
| Environment promotion          | README mentions dev/staging/prod manual placeholders, not a full promotion model. ([GitHub][2])                                                   |
| Secret management              | Generates env placeholders like JWT/OAuth/OTEL; no Vault/SSM/Secrets Manager integration found. ([GitHub][3])                                     |
| MCP/AI                         | Not implemented; only suitable for wrapping. ([GitHub][4])                                                                                        |
| Template migrations            | `update` copies missing files and regenerates Compose; it does not apply schema/code migrations or conflict-aware upgrades. ([GitHub][5])         |
| Feature add/remove breadth     | Only `logging`, `kafka`, and `rabbitmq` are supported post-creation. ([GitHub][6])                                                                |
| Kubernetes                     | No Kubernetes/Helm command surface found in this repo; local orchestration is Docker Compose and cloud infra is Pulumi AWS starter. ([GitHub][2]) |
| Policy/governance              | No policy-as-code, approvals, ownership catalog, scorecards, SLOs, or compliance checks found.                                                    |
| Service dependency graph       | Registry lists services, but I found no dependency graph or topology model.                                                                       |
| Multi-cloud                    | Pulumi starter is described as AWS-oriented. ([GitHub][2])                                                                                        |
