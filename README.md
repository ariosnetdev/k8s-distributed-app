# Kubernetes distributed service demo

each pod maintains a running list of all other pods via the kube rest api.
on an interval each pod sends a heartbeat message to it's friends.

includes a landing page that recieves live updates of pod statuses as they change

## Run the demo locally

*PREREQS:*
- Linux (not tested anywhere else)
- Docker
- [KIND](https://kind.sigs.k8s.io/docs/user/quick-start/)
- kubectl

```sh
$ kind create cluster --config=./cluster.yml
$ docker build . -t myapp:latest
$ kind load docker-image myapp --name local-dev
# make sure you have kubeconfig set up properly to talk to KIND
$ kubectl apply -f deployment.yml
```

use `update.sh` to push changes to the cluster once code changes are made

## Todo

- [ ] fix the double request to kube rest api on start up
- [ ] implement a consensus algo for distributing data across the cluster

