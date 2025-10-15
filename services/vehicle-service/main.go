package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"os"

	_ "github.com/lib/pq" // PostgreSQL driver
	"google.golang.org/grpc"
	
	// This will be the path to your auto-generated proto code
	// We will generate this file in a later step.
	// pb "myvahaan/vehicle-service/proto" 
)

func main() {
	fmt.Println("Vehicle service starting...")
}