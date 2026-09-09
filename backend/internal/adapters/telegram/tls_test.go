package telegram

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/config"
)

func TestDirectIPKeepsHostnameSNIAndCertificateVerification(t *testing.T) {
	for _, name := range []string{"api.telegram.org", "wrong.example"} {
		t.Run(name, func(t *testing.T) {
			key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
			if err != nil {
				t.Fatal(err)
			}
			template := &x509.Certificate{
				SerialNumber: big.NewInt(1), DNSNames: []string{name},
				NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour),
				KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
			}
			der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
			if err != nil {
				t.Fatal(err)
			}
			cert, err := x509.ParseCertificate(der)
			if err != nil {
				t.Fatal(err)
			}
			server := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.TLS.ServerName != "api.telegram.org" {
					t.Errorf("SNI changed: %s", r.TLS.ServerName)
				}
				fmt.Fprint(w, `{"ok":true,"result":true}`)
			}))
			server.TLS = &tls.Config{MinVersion: tls.VersionTLS12, Certificates: []tls.Certificate{{Certificate: [][]byte{der}, PrivateKey: key}}}
			server.StartTLS()
			defer server.Close()
			_, port, _ := net.SplitHostPort(server.Listener.Addr().String())
			sender := New(config.Telegram{BotToken: "test", APIBase: "https://api.telegram.org:" + port,
				Timeout: time.Second, DirectIPs: []string{"127.0.0.1"}}).(*botSender)
			transport := sender.client.Transport.(*http.Transport)
			transport.Proxy = nil
			roots := x509.NewCertPool()
			roots.AddCert(cert)
			transport.TLSClientConfig = &tls.Config{MinVersion: tls.VersionTLS12, RootCAs: roots}
			err = sender.DeleteWebhook(context.Background())
			if name == "api.telegram.org" && err != nil {
				t.Fatal(err)
			}
			if name != "api.telegram.org" && err == nil {
				t.Fatal("accepted certificate for another hostname")
			}
		})
	}
}
