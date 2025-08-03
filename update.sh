docker build . -t myapp:latest
kind load docker-image myapp --name local-dev
kubectl rollout restart deploy myapp
