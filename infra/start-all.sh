

# Config
AUTH_COMPOSE="services/auth-service/docker-compose.yml"
CAT_COMPOSE="services/catalog-order-service/docker-compose.yml"
PROJECT_AUTH="authsvc"
PROJECT_CAT="catalogsvc"
SHARED_NET="staging_net"

echo "=> Creando red compartida '$SHARED_NET' (si no existe)..."
docker network create -d bridge "$SHARED_NET" 2>/dev/null || true

echo "=> Levantando stack AUTH (project: $PROJECT_AUTH)..."
docker compose -p "$PROJECT_AUTH" -f "$AUTH_COMPOSE" up -d --build

echo "=> Levantando stack CATALOG (project: $PROJECT_CAT)..."
docker compose -p "$PROJECT_CAT" -f "$CAT_COMPOSE" up -d --build


echo "=> Buscando contenedores de aplicación..."
AUTH_APP_ID=$(docker compose -p "$PROJECT_AUTH" -f "$AUTH_COMPOSE" ps -q | head -n1 || true)
CAT_APP_ID=$(docker compose -p "$PROJECT_CAT" -f "$CAT_COMPOSE" ps -q | head -n1 || true)

if [ -z "$AUTH_APP_ID" ]; then
  echo "!!! No pude detectar contenedor de AUTH automáticamente. Lista los contenedores con: docker compose -p $PROJECT_AUTH -f $AUTH_COMPOSE ps"
else
  echo "=> Conectando contenedor AUTH ($AUTH_APP_ID) a la red $SHARED_NET"
  docker network connect "$SHARED_NET" "$AUTH_APP_ID" 2>/dev/null || true
fi

if [ -z "$CAT_APP_ID" ]; then
  echo "!!! No pude detectar contenedor de CATALOG automáticamente. Lista los contenedores con: docker compose -p $PROJECT_CAT -f $CAT_COMPOSE ps"
else
  echo "=> Conectando contenedor CATALOG ($CAT_APP_ID) a la red $SHARED_NET"
  docker network connect "$SHARED_NET" "$CAT_APP_ID" 2>/dev/null || true
fi

echo "=> Intentando localizar contenedores Postgres y conectarlos con alias..."
AUTH_PG=$(docker compose -p "$PROJECT_AUTH" -f "$AUTH_COMPOSE" ps -q postgres || true)
CAT_PG=$(docker compose -p "$PROJECT_CAT" -f "$CAT_COMPOSE" ps -q postgres || true)

if [ -n "$AUTH_PG" ]; then
  echo " - Conectando postgres AUTH ($AUTH_PG) con alias auth-db"
  docker network connect --alias auth-db "$SHARED_NET" "$AUTH_PG" 2>/dev/null || true
fi
if [ -n "$CAT_PG" ]; then
  echo " - Conectando postgres CATALOG ($CAT_PG) con alias catalog-db"
  docker network connect --alias catalog-db "$SHARED_NET" "$CAT_PG" 2>/dev/null || true
fi

echo "=> Esperando 3s para que la red se propague..."
sleep 3

echo "=> Estado resumen:"
docker ps --filter "name=${PROJECT_AUTH}" --filter "name=${PROJECT_CAT}" --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"

echo "=> Pruebas rápidas de /health (si tus servicios exponen endpoints):"
if [ -n "$AUTH_APP_ID" ]; then
  echo " - AUTH -> curl http://localhost:3101/health  (ajusta puerto si tu compose mapea otro)"
fi
if [ -n "$CAT_APP_ID" ]; then
  echo " - CATALOG -> curl http://localhost:3102/health  (ajusta puerto si tu compose mapea otro)"
fi

echo "¡Listo! Si necesitas desconectar todo:"
echo "  docker compose -p $PROJECT_AUTH -f $AUTH_COMPOSE down"
echo "  docker compose -p $PROJECT_CAT -f $CAT_COMPOSE down"
echo "Y para borrar la red: docker network rm $SHARED_NET"
