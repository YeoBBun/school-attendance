package io.github.yeobbun.attendancewidget

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView

/** 연결 설정: 출결 앱 설정 → 휴대폰 ↔ PC 동기화에 넣은 것과 같은 저장소·비밀번호 */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val p = Prefs(this)
        val repo = findViewById<EditText>(R.id.repo)
        val token = findViewById<EditText>(R.id.token)
        val pass = findViewById<EditText>(R.id.passphrase)
        val url = findViewById<EditText>(R.id.appUrl)
        val save = findViewById<Button>(R.id.save)
        val result = findViewById<TextView>(R.id.result)

        repo.setText(p.repo)
        token.setText(p.token)
        pass.setText(p.passphrase)
        url.setText(p.appUrl)
        result.text = describe(p)

        save.setOnClickListener {
            val newRepo = GitHub.normalizeRepo(repo.text.toString())
            val changed = newRepo != p.repo || token.text.toString().trim() != p.token ||
                pass.text.toString() != p.passphrase
            p.repo = newRepo
            repo.setText(newRepo)
            p.token = token.text.toString().trim()
            p.passphrase = pass.text.toString()
            p.appUrl = url.text.toString().trim().ifEmpty { Prefs.DEFAULT_APP_URL }
            if (changed) p.clearCache()
            save.isEnabled = false
            result.text = "불러오는 중…"
            Thread {
                Refresh.run(this)
                runOnUiThread {
                    save.isEnabled = true
                    result.text = describe(p)
                    Refresh.schedule(this)
                    PendingWidget.updateAll(this)
                }
            }.start()
        }
    }

    private fun describe(p: Prefs): String {
        if (!p.configured) return "출결 앱과 같은 저장소·토큰·잠금 비밀번호를 넣고 저장하세요."
        p.error?.let { return "⚠ $it" }
        val s = p.summary() ?: return ""
        val head = if (s.items.isEmpty()) "✓ 받을 서류가 없어요." else "받을 서류 ${s.items.size}건을 불러왔어요."
        return "$head\n\n홈 화면을 길게 눌러 위젯 → '받을 서류' 를 추가하세요."
    }
}
