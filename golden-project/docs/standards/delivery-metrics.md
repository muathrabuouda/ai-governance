# Delivery metrics — measured monthly (the four DORA keys)

| Metric                | How we measure it in Mawid                                    | Where the data comes from   |
| --------------------- | ------------------------------------------------------------- | --------------------------- |
| Deployment frequency  | Production deploys per week                                   | deploy workflow runs        |
| Lead time for changes | First commit of a PR → in production                          | PR merge time + deploy time |
| Change failure rate   | Deploys followed by a rollback, a hotfix or a flag turned off | runbook log                 |
| Time to restore       | Incident start → service restored                             | docs/incidents/             |

With agents writing more code, watch the second pair: speed that raises the failure rate is not speed.
