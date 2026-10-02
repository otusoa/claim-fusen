package api

import (
	"net/http"

	"api/internal/service"
	"github.com/gin-gonic/gin"
)

// Handlerは起動時に作成したServiceを共有し、DBの終了処理はアプリ側で管理する。
type handler struct {
	projects *service.ProjectService
}

func NewRouter(projects *service.ProjectService) *gin.Engine {
	h := &handler{projects: projects}
	router := gin.Default()
	router.GET("/health", h.health)
	return router
}

func (h *handler) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "OK"})
}
