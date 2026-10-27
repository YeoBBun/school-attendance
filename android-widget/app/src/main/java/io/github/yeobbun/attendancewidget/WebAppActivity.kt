package io.github.yeobbun.attendancewidget

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File

/**
 * 출결 앱(웹)을 이 앱 화면 안에서 연다 — 브라우저 없이 앱으로.
 * 데이터는 이 앱 안(WebView 저장 공간)에 따로 저장되므로, 처음 한 번 출결 앱 설정에서 동기화를 연결한다.
 * 파일 저장·공유·선택은 WebView 가 그냥은 못 해서 여기서 맡는다 (출결 앱 src/platform/android.ts 와 짝).
 */
class WebAppActivity : Activity() {
    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    /** 저장 위치를 고르는 동안 들고 있는 파일 내용 */
    private var pendingSave: ByteArray? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        val home = Uri.parse(Prefs(this).appUrl)

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.addJavascriptInterface(Bridge(), "AttendanceApp")
        web.webViewClient = object : WebViewClient() {
            // 출결 앱 밖의 링크(깃허브 등)는 브라우저로
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val u = req.url
                if (u.host == home.host && (u.path ?: "").startsWith(home.path ?: "/")) return false
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, u))
                } catch (e: ActivityNotFoundException) {
                    // 열 앱이 없으면 무시
                }
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            // 백업 불러오기 등 <input type="file">
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    @Suppress("DEPRECATION")
                    startActivityForResult(params.createIntent(), REQ_PICK)
                    true
                } catch (e: ActivityNotFoundException) {
                    fileCallback = null
                    false
                }
            }
        }
        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(home.toString())
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        // 서류를 '받음' 으로 바꿨으면 출결 앱이 요약을 올린 뒤(고친 뒤 4초 + 올리기) 위젯도 새로 받는다
        Refresh.later(this, 20)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        when (requestCode) {
            REQ_PICK -> {
                fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
                fileCallback = null
            }
            REQ_SAVE -> {
                val bytes = pendingSave
                pendingSave = null
                val uri = data?.data
                if (resultCode != RESULT_OK || bytes == null || uri == null) return
                try {
                    contentResolver.openOutputStream(uri)!!.use { it.write(bytes) }
                    toast("저장했어요.")
                } catch (e: Exception) {
                    toast("저장하지 못했어요: ${e.message}")
                }
            }
        }
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

    /** 출결 앱(웹)이 부르는 것. 자바스크립트 쪽 스레드에서 불리므로 화면 일은 runOnUiThread 로. */
    private inner class Bridge {
        @JavascriptInterface
        fun saveFile(name: String, mime: String, base64: String) {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            runOnUiThread {
                pendingSave = bytes
                val pick = Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(mime)
                    .putExtra(Intent.EXTRA_TITLE, name)
                try {
                    @Suppress("DEPRECATION")
                    startActivityForResult(pick, REQ_SAVE)
                } catch (e: ActivityNotFoundException) {
                    pendingSave = null
                    toast("파일을 저장할 수 없는 휴대폰이에요.")
                }
            }
        }

        @JavascriptInterface
        fun shareFile(name: String, mime: String, base64: String) {
            val dir = File(cacheDir, "share").apply { mkdirs() }
            val file = File(dir, File(name).name) // 경로가 섞여 와도 이름만
            file.writeBytes(Base64.decode(base64, Base64.DEFAULT))
            val uri = FileProvider.getUriForFile(this@WebAppActivity, "$packageName.files", file)
            val send = Intent(Intent.ACTION_SEND)
                .setType(mime)
                .putExtra(Intent.EXTRA_STREAM, uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            runOnUiThread { startActivity(Intent.createChooser(send, "나이스 입력 파일 보내기")) }
        }

        /** 출결 앱의 동기화 설정을 위젯도 쓴다. 바뀌었을 때만 받아 둔 것을 버리고 새로 받는다. */
        @JavascriptInterface
        fun setSyncConfig(json: String) {
            val p = Prefs(this@WebAppActivity)
            val (repo, token, pass) = if (json.isEmpty()) Triple("", "", "") else JSONObject(json).let {
                Triple(it.optString("repo"), it.optString("token"), it.optString("passphrase"))
            }
            if (repo == p.repo && token == p.token && pass == p.passphrase) return
            p.repo = repo
            p.token = token
            p.passphrase = pass
            p.clearCache()
            if (p.configured) Refresh.now(this@WebAppActivity)
            PendingWidget.updateAll(this@WebAppActivity)
        }
    }

    companion object {
        private const val REQ_PICK = 1
        private const val REQ_SAVE = 2
    }
}
