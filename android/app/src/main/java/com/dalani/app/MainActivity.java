package com.dalani.app;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register native Android printing interface on Capacitor WebView
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().addJavascriptInterface(new AndroidPrintInterface(), "AndroidPrinter");
        }
    }

    public class AndroidPrintInterface {

        @JavascriptInterface
        public boolean isAvailable() {
            return true;
        }

        @JavascriptInterface
        public void printDocument(final String jobTitle, final String htmlContent) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (printManager == null) {
                            return;
                        }

                        final String safeTitle = (jobTitle != null && !jobTitle.trim().isEmpty())
                                ? jobTitle
                                : "Dalani_Contract";

                        if (htmlContent != null && !htmlContent.trim().isEmpty()) {
                            // Dedicated print WebView for rendering isolated A4 document
                            final WebView printWebView = new WebView(MainActivity.this);
                            printWebView.setWebViewClient(new WebViewClient() {
                                @Override
                                public void onPageFinished(WebView view, String url) {
                                    try {
                                        PrintDocumentAdapter printAdapter = printWebView.createPrintDocumentAdapter(safeTitle);
                                        PrintAttributes.Builder builder = new PrintAttributes.Builder();
                                        builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                                        builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                                        printManager.print(safeTitle, printAdapter, builder.build());
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                    }
                                }
                            });
                            printWebView.loadDataWithBaseURL("https://dalani.app", htmlContent, "text/html", "UTF-8", null);
                        } else if (getBridge() != null && getBridge().getWebView() != null) {
                            // Direct fallback to main app view
                            PrintDocumentAdapter printAdapter = getBridge().getWebView().createPrintDocumentAdapter(safeTitle);
                            PrintAttributes.Builder builder = new PrintAttributes.Builder();
                            builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                            printManager.print(safeTitle, printAdapter, builder.build());
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }
}
