package pipeline

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"

	"github.com/xyn3x/hacknu-ktzh/services/ingestion/internal/model"
)

const Subject = "telemetry.frame"

type Forwarder struct {
	w *kafka.Writer
}

func NewForwarder(brokers []string) *Forwarder {
	return &Forwarder{
		w: &kafka.Writer{
			Addr:                   kafka.TCP(brokers...),
			Topic:                  Subject,
			Balancer:               &kafka.LeastBytes{},
			AllowAutoTopicCreation: true,
		},
	}
}

func (f *Forwarder) Forward(t *model.Telemetry) error {
	data, err := json.Marshal(t)
	if err != nil {
		return fmt.Errorf("error marshaling telemetry to json: %w", err)
	}

	return f.w.WriteMessages(
		context.Background(),
		kafka.Message{
			Value: data,
		},
	)
}

func (f *Forwarder) Close() {
	_ = f.w.Close()
}